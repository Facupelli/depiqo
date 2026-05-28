import { AsyncLocalStorage } from 'async_hooks';

export interface CanonicalLog {
  // --- Request identity ---
  requestId: string;
  httpMethod?: string;
  httpPath?: string;
  httpStatus?: number;

  // --- Timing ---
  startedAt?: number; // Unix ms, internal use
  durationMs?: number;

  // --- Auth context ---
  userId?: string;
  userRole?: string;

  // --- Performance ---
  dbQueries?: number;
  dbDurationMs?: number;
  cacheHits?: number;
  cacheMisses?: number;
  domainEventsPublished?: number;
  domainEventNames?: string[];
  domainEventPublishFailures?: number;
  domainEventHandlerFailures?: number;

  // --- Outcome ---
  errorCode?: string;
  errorMessage?: string;
  problemType?: string;
  problemTitle?: string;
  problemDetail?: string;

  // --- Extensible ---
  [key: string]: unknown;
}

const store = new AsyncLocalStorage<CanonicalLog>();

/**
 * LogContext provides static access to the per-request canonical log object.
 * Any code running within the same async context (same request) can call
 * LogContext.set() to enrich the canonical log, and LogContext.flush() to emit it.
 */
export class LogContext {
  /**
   * Run a function within a new async context, bound to a fresh canonical log.
   * This is called once per request in the middleware.
   */
  static run(log: CanonicalLog, fn: () => void): void {
    store.run(log, fn);
  }

  /**
   * Add or update a field in the current request's canonical log.
   * Safe to call from anywhere — no-ops if there's no active context.
   */
  static set(key: keyof CanonicalLog, value: unknown): void {
    const log = store.getStore();
    if (log) {
      log[key] = value;
    }
  }

  /**
   * Increment a numeric counter field. Useful for tracking DB query counts, etc.
   */
  static increment(key: keyof CanonicalLog, by = 1): void {
    const log = store.getStore();
    if (log) {
      const current = (log[key] as number) ?? 0;
      log[key] = current + by;
    }
  }

  /**
   * Read a field from the current canonical log.
   */
  static get<K extends keyof CanonicalLog>(key: K): CanonicalLog[K] | undefined {
    return store.getStore()?.[key];
  }

  /**
   * Get the full canonical log object (a snapshot, not a copy).
   */
  static getStore(): CanonicalLog | undefined {
    return store.getStore();
  }

  /**
   * Returns a frozen snapshot of the log, ready to be emitted.
   * Computes durationMs from startedAt.
   */
  static flush(): CanonicalLog | null {
    const log = store.getStore();
    if (!log) return null;

    if (log.startedAt) {
      log.durationMs = Date.now() - log.startedAt;
    }

    return { ...log };
  }
}
