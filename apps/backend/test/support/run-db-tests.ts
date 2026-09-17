import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const projectRequire = createRequire(resolve(process.cwd(), 'package.json'));
const vitestExecutable = projectRequire.resolve('vitest/vitest.mjs');

async function main(): Promise<void> {
  const configPath = process.argv[2];
  if (!configPath) {
    throw new Error('Expected a Vitest config path.');
  }

  const container = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('depiqo_test')
    .withUsername('test')
    .withPassword('test')
    .start();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: container.getConnectionUri(),
    CORS_ALLOWED_ORIGINS: 'http://localhost',
    BFF_INTERNAL_TOKEN: 'test-bff-token',
    STOREFRONT_TENANT_JWT_SECRET: 'test-storefront-secret',
    STOREFRONT_TENANT_JWT_ISSUER: 'depiqo-test',
    STOREFRONT_TENANT_JWT_AUDIENCE: 'depiqo-test',
    SESSION_SECRET: 'test-session-secret-at-least-32-characters',
    GOOGLE_CLIENT_ID: 'test-google-client',
    GOOGLE_CLIENT_SECRET: 'test-google-secret',
    GOOGLE_OAUTH_REDIRECT_URI: 'http://localhost/auth/callback',
    CLOUDFLARE_API_TOKEN: 'test-cloudflare-token',
    CLOUDFLARE_ZONE_ID: 'test-cloudflare-zone',
    CLOUDFLARE_ACCOUNT_ID: 'test-r2-account',
    R2_SIGNING_BUCKET_NAME: 'test-r2-bucket',
    R2_SIGNING_ACCESS_KEY_ID: 'test-r2-access-key',
    R2_SIGNING_SECRET_ACCESS_KEY: 'test-r2-secret-key',
    PUBLIC_SIGNING_ORIGIN: 'https://sign.example.test',
    RESEND_API_KEY: 're_test',
    NOTIFICATIONS_EMAIL_FROM: 'test@example.com',
    NOTIFICATIONS_MUTED_CHANNELS_BY_ENV: '{"test":["EMAIL"]}',
    ROOT_DOMAIN: 'localhost',
    GEOAPIFY_API_KEY: 'test-geoapify-key',
  };

  let testRun: TestRun | undefined;
  let outcome: TestOutcome | undefined;
  let cleanupError: unknown;

  try {
    console.log('Preparing test database...');
    run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], env);
    console.log('Test database ready.');
    const runnerArgs = process.argv.slice(3).filter((argument) => argument !== '--');
    testRun = startTestRunner(['run', '--config', configPath, ...runnerArgs], env);
    outcome = await testRun.outcome;
  } finally {
    try {
      await container.stop();
    } catch (error) {
      cleanupError = error;
      console.error('Failed to stop the PostgreSQL test container:', error);
    } finally {
      testRun?.removeSignalHandlers();
    }
  }

  if (!testRun || !outcome) return;

  const terminationSignal = testRun.receivedSignal() ?? outcome.signal;
  if (terminationSignal) {
    process.kill(process.pid, terminationSignal);
    return;
  }
  if (cleanupError) throw cleanupError;
  process.exitCode = outcome.exitCode;
}

type TestOutcome = { exitCode: number; signal: NodeJS.Signals | null };
type TestRun = {
  outcome: Promise<TestOutcome>;
  receivedSignal(): NodeJS.Signals | null;
  removeSignalHandlers(): void;
};

function startTestRunner(args: string[], env: NodeJS.ProcessEnv): TestRun {
  const usesProcessGroup = process.platform !== 'win32';
  const child = spawn(process.execPath, [vitestExecutable, ...args], {
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
        // SAFETY: Node process signaling failures expose their stable error code through ErrnoException.
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
        console.error(`Failed to forward ${signal} to the Vitest process group:`, error);
      }
    }
    child.kill(signal);
  };

  for (const signal of handledSignals) {
    const handler = (): void => forwardSignal(signal);
    signalHandlers.set(signal, handler);
    process.on(signal, handler);
  }

  const outcome = new Promise<TestOutcome>((resolve) => {
    let settled = false;
    const settle = (result: TestOutcome): void => {
      if (settled) return;
      settled = true;
      childClosed = true;
      resolve(result);
    };
    child.once('error', (error) => {
      console.error('Failed to start Vitest:', error);
      settle({ exitCode: 1, signal: null });
    });
    child.once('close', (exitCode, signal) => settle({ exitCode: exitCode ?? 1, signal }));
  });

  return {
    outcome,
    receivedSignal: () => firstReceivedSignal,
    removeSignalHandlers: () => {
      for (const [signal, handler] of signalHandlers) process.removeListener(signal, handler);
    },
  };
}

function run(command: string, args: string[], commandEnv: NodeJS.ProcessEnv): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: commandEnv,
    stdio: ['inherit', 'pipe', 'pipe'],
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });

  if (result.error || result.signal || result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);

    const commandDescription = `${command} ${args.join(' ')}`;
    if (result.error) {
      throw new Error(`Failed to execute ${commandDescription}: ${result.error.message}`, { cause: result.error });
    }
    if (result.signal) throw new Error(`${commandDescription} was terminated by signal ${result.signal}`);
    throw new Error(`${commandDescription} failed with status ${result.status}`);
  }
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
