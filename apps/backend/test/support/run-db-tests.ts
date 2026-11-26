import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { constants } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const interruptSignals = ['SIGINT', 'SIGTERM', 'SIGHUP'] as const;
const shutdownGraceMs = 5_000;

class RunInterrupted extends Error {
  constructor(readonly signal: (typeof interruptSignals)[number]) {
    super(`Received ${signal}`);
  }
}

class CommandFailed extends Error {
  constructor(
    message: string,
    readonly exitCode: number,
  ) {
    super(message);
  }
}

async function main(): Promise<void> {
  const startedAt = performance.now();
  const cancellation = new AbortController();
  const handlers = interruptSignals.map((signal) => {
    const onSignal = (): void => {
      if (cancellation.signal.aborted) return;
      console.error(`[db-tests] Received ${signal}; cancelling and cleaning up.`);
      cancellation.abort(new RunInterrupted(signal));
    };
    process.on(signal, onSignal);
    return { signal, onSignal };
  });
  let container: StartedPostgreSqlContainer | undefined;
  let exitCode = 0;

  try {
    const [configPath, ...args] = process.argv.slice(2);
    if (!configPath) throw new Error('Expected a Vitest config path.');
    const projectRequire = createRequire(resolve(process.cwd(), 'package.json'));
    const vitestExecutable = projectRequire.resolve('vitest/vitest.mjs');

    container = await runPhase('PostgreSQL startup', () =>
      new PostgreSqlContainer('postgres:18-alpine')
        .withDatabase('depiqo_test')
        .withUsername('test')
        .withPassword('test')
        .start(),
    );
    cancellation.signal.throwIfAborted();
    const env = testEnvironment(container.getConnectionUri());
    await runPhase('Prisma migrate deploy', () =>
      runCommand('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], env, cancellation.signal),
    );
    await runPhase('Vitest', () =>
      runCommand(
        process.execPath,
        [vitestExecutable, 'run', '--config', configPath, ...args.filter((arg) => arg !== '--')],
        env,
        cancellation.signal,
      ),
    );
  } catch (error) {
    if (!(error instanceof RunInterrupted)) console.error('[db-tests]', error);
    exitCode = error instanceof CommandFailed ? error.exitCode : 1;
  } finally {
    if (container) {
      const startedContainer = container;
      try {
        await runPhase('PostgreSQL teardown', () => startedContainer.stop());
      } catch (error) {
        console.error(`[db-tests] Could not remove PostgreSQL container ${startedContainer.getId()}:`, error);
        if (exitCode === 0) exitCode = 1;
      }
    }
    const interruption = cancellation.signal.reason;
    if (interruption instanceof RunInterrupted) exitCode = signalExitCode(interruption.signal);
    process.exitCode = exitCode;
    console.log(`[db-tests] Finished in ${elapsed(startedAt)} (exit ${exitCode}).`);
    for (const { signal, onSignal } of handlers) process.removeListener(signal, onSignal);
  }
}

function testEnvironment(databaseUrl: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'silent',
    DATABASE_URL: databaseUrl,
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
}

async function runPhase<T>(label: string, run: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  console.log(`[db-tests] ${label} started.`);
  try {
    const result = await run();
    console.log(`[db-tests] ${label} completed in ${elapsed(startedAt)}.`);
    return result;
  } catch (error) {
    const status = error instanceof RunInterrupted ? 'interrupted' : 'failed';
    console.error(`[db-tests] ${label} ${status} after ${elapsed(startedAt)}.`);
    throw error;
  }
}

function elapsed(startedAt: number): string {
  return `${((performance.now() - startedAt) / 1000).toFixed(2)}s`;
}

function signalExitCode(signal: NodeJS.Signals): number {
  return 128 + constants.signals[signal];
}

async function runCommand(
  executable: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  cancellation: AbortSignal,
): Promise<void> {
  cancellation.throwIfAborted();
  const usesProcessGroup = process.platform !== 'win32';
  const child = spawn(executable, args, { env, stdio: 'inherit', detached: usesProcessGroup });
  const pid = child.pid;
  let forceStop: NodeJS.Timeout | undefined;

  const send = (signal: NodeJS.Signals): void => {
    if (pid === undefined) return;
    try {
      if (usesProcessGroup) process.kill(-pid, signal);
      else child.kill(signal);
    } catch (error) {
      // SAFETY: Node process signaling failures expose their stable error code through ErrnoException.
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
        console.error(`[db-tests] Could not send ${signal}:`, error);
      }
    }
  };
  const onAbort = (): void => {
    const reason = cancellation.reason;
    if (!(reason instanceof RunInterrupted)) return;
    send(reason.signal);
    forceStop = setTimeout(() => {
      console.error('[db-tests] Child did not stop within the grace period; sending SIGKILL.');
      send('SIGKILL');
    }, shutdownGraceMs);
  };
  cancellation.addEventListener('abort', onAbort, { once: true });

  try {
    await new Promise<void>((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => {
        if (signal) reject(new CommandFailed(`Child terminated by ${signal}.`, signalExitCode(signal)));
        else if (code !== 0) reject(new CommandFailed(`Child exited with status ${code}.`, code ?? 1));
        else resolve();
      });
    });
  } catch (error) {
    cancellation.throwIfAborted();
    throw error;
  } finally {
    cancellation.removeEventListener('abort', onAbort);
    clearTimeout(forceStop);
    if (cancellation.aborted && usesProcessGroup) send('SIGKILL');
  }
  cancellation.throwIfAborted();
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
