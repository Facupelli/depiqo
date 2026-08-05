import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const projectRequire = createRequire(resolve(process.cwd(), 'package.json'));
const jestExecutable = projectRequire.resolve('jest/bin/jest');

async function main(): Promise<void> {
  const configPath = process.argv[2];
  if (!configPath) throw new Error('Expected a Jest config path.');

  const databaseName = `depiqo_test_${randomUUID().replaceAll('-', '')}`;
  const container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase(databaseName)
    .withUsername('test')
    .withPassword('test')
    .start();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'test',
    NODE_OPTIONS: [process.env.NODE_OPTIONS, '--experimental-vm-modules'].filter(Boolean).join(' '),
    LOG_LEVEL: 'silent',
    DATABASE_URL: container.getConnectionUri(),
    TEST_DATABASE_NAME: databaseName,
    CORS_ALLOWED_ORIGINS: 'http://localhost',
    BFF_INTERNAL_TOKEN: 'test-bff-token',
    STOREFRONT_TENANT_JWT_SECRET: 'test-storefront-secret',
    STOREFRONT_TENANT_JWT_ISSUER: 'depiqo-test',
    STOREFRONT_TENANT_JWT_AUDIENCE: 'depiqo-test',
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
    GOOGLE_CLIENT_ID: 'test-google-client',
    GOOGLE_CLIENT_SECRET: 'test-google-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost/auth/callback',
    GOOGLE_AUTH_STATE_SECRET: 'test-google-state-secret',
    CLOUDFLARE_API_TOKEN: 'test-cloudflare-token',
    CLOUDFLARE_ZONE_ID: 'test-cloudflare-zone',
    R2_ACCOUNT_ID: 'test-r2-account',
    R2_BUCKET_NAME: 'test-r2-bucket',
    R2_ACCESS_KEY_ID: 'test-r2-access-key',
    R2_SECRET_ACCESS_KEY: 'test-r2-secret-key',
    RESEND_API_KEY: 're_test',
    NOTIFICATIONS_EMAIL_FROM: 'test@example.com',
    NOTIFICATIONS_MUTED_CHANNELS_BY_ENV: '{"test":["EMAIL"]}',
    INTERNAL_API_TOKEN: 'test-internal-token',
    ROOT_DOMAIN: 'localhost',
  };

  let jestRun: JestRun | undefined;
  let outcome: JestOutcome | undefined;
  let cleanupError: unknown;

  try {
    run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], env);

    const jestArgs = process.argv.slice(3).filter((argument) => argument !== '--');

    jestRun = startJest(['--config', configPath, ...jestArgs], env);
    outcome = await jestRun.outcome;
  } finally {
    try {
      await container.stop();
    } catch (error) {
      cleanupError = error;
      console.error('Failed to stop the PostgreSQL test container:', error);
    } finally {
      jestRun?.removeSignalHandlers();
    }
  }

  if (!jestRun || !outcome) return;

  const terminationSignal = jestRun.receivedSignal() ?? outcome.signal;

  if (terminationSignal) {
    process.kill(process.pid, terminationSignal);
    return;
  }

  if (cleanupError) {
    throw cleanupError;
  }

  process.exitCode = outcome.exitCode;
}

type JestOutcome = {
  exitCode: number;
  signal: NodeJS.Signals | null;
};

type JestRun = {
  outcome: Promise<JestOutcome>;
  receivedSignal(): NodeJS.Signals | null;
  removeSignalHandlers(): void;
};

function startJest(args: string[], env: NodeJS.ProcessEnv): JestRun {
  const usesProcessGroup = process.platform !== 'win32';

  const child = spawn(process.execPath, [jestExecutable, ...args], {
    cwd: process.cwd(),
    env,
    stdio: 'inherit',
    detached: usesProcessGroup,
  });

  const handledSignals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGHUP'];

  const signalHandlers = new Map<NodeJS.Signals, () => void>();

  let firstReceivedSignal: NodeJS.Signals | null = null;
  let childClosed = false;

  const forwardSignal = (signal: NodeJS.Signals): void => {
    if (firstReceivedSignal) return;

    firstReceivedSignal = signal;

    if (childClosed) return;

    if (usesProcessGroup && child.pid !== undefined) {
      try {
        process.kill(-child.pid, signal);
        return;
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;

        if (code === 'ESRCH') return;

        console.error(`Failed to forward ${signal} to the Jest process group:`, error);
      }
    }

    child.kill(signal);
  };

  for (const signal of handledSignals) {
    const handler = (): void => {
      forwardSignal(signal);
    };

    signalHandlers.set(signal, handler);
    process.on(signal, handler);
  }

  const outcome = new Promise<JestOutcome>((resolve) => {
    let settled = false;

    const settle = (result: JestOutcome): void => {
      if (settled) return;

      settled = true;
      childClosed = true;
      resolve(result);
    };

    child.once('error', (error) => {
      console.error('Failed to start Jest:', error);
      settle({ exitCode: 1, signal: null });
    });

    child.once('close', (exitCode, signal) => {
      settle({
        exitCode: exitCode ?? 1,
        signal,
      });
    });
  });

  return {
    outcome,
    receivedSignal: () => firstReceivedSignal,
    removeSignalHandlers: () => {
      for (const [signal, handler] of signalHandlers) {
        process.removeListener(signal, handler);
      }
    },
  };
}

function run(command: string, args: string[], commandEnv: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: commandEnv,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with status ${result.status}`);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
