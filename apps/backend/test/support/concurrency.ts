export type BarrierOptions = {
  timeoutMs?: number;
};

export type Barrier = {
  wait(): Promise<void>;
  abort(reason?: unknown): void;
};

const DEFAULT_BARRIER_TIMEOUT_MS = 5_000;

/**
 * Coordinates a fixed number of test participants at an explicit rendezvous point.
 *
 * The timeout starts when the first participant arrives. Once released, timed out,
 * or aborted, the barrier is terminal.
 */
export function createBarrier(participantCount: number, options: BarrierOptions = {}): Barrier {
  if (!Number.isInteger(participantCount) || participantCount < 1) {
    throw new Error(`Barrier participant count must be a positive integer, received ${participantCount}.`);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_BARRIER_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Barrier timeout must be a positive finite number, received ${timeoutMs}.`);
  }

  let arrivedCount = 0;
  let state: 'pending' | 'released' | 'failed' = 'pending';
  let failure: Error | undefined;
  let timeout: NodeJS.Timeout | undefined;
  const waiters: Array<{ resolve(): void; reject(error: Error): void }> = [];

  const clearTimeoutIfScheduled = (): void => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }
  };

  const release = (): void => {
    state = 'released';
    clearTimeoutIfScheduled();

    for (const waiter of waiters) {
      waiter.resolve();
    }
    waiters.length = 0;
  };

  const fail = (error: Error): void => {
    state = 'failed';
    failure = error;
    clearTimeoutIfScheduled();

    for (const waiter of waiters) {
      waiter.reject(error);
    }
    waiters.length = 0;
  };

  return {
    wait: () => {
      if (state === 'released') return Promise.resolve();
      if (state === 'failed') return Promise.reject(failure);

      arrivedCount += 1;
      const promise = new Promise<void>((resolve, reject) => {
        waiters.push({ resolve, reject });
      });

      if (arrivedCount === 1) {
        timeout = setTimeout(() => {
          fail(
            new Error(
              `Concurrency barrier timed out: expected ${participantCount} participants, but only ${arrivedCount} arrived.`,
            ),
          );
        }, timeoutMs);
      }

      if (arrivedCount === participantCount) {
        release();
      }

      return promise;
    },
    abort: (reason) => {
      if (state !== 'pending') return;

      fail(toBarrierAbortError(reason));
    },
  };
}

/**
 * Starts every supplied operation behind one common release gate and returns each
 * outcome. It coordinates start only; it does not prove internal critical-section
 * overlap or cancel operations that do not settle.
 */
export async function runConcurrently<T>(
  operations: readonly (() => Promise<T> | T)[],
): Promise<PromiseSettledResult<T>[]> {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });

  const tasks = operations.map(async (operation) => {
    await gate;
    return operation();
  });

  release();
  return Promise.allSettled(tasks);
}

function toBarrierAbortError(reason: unknown): Error {
  if (reason instanceof Error) return reason;
  if (reason === undefined) return new Error('Concurrency barrier aborted.');

  return new Error(`Concurrency barrier aborted: ${String(reason)}`);
}
