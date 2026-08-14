export interface SerializedPinoError {
  type: string;
  message: string;
  code?: string | number;
  stack?: string;
  cause?: SerializedPinoError | string | number | boolean | null | { type: string; value?: string };
  causeTruncated?: 'max_depth' | 'circular';
}

const MAX_CAUSE_DEPTH = 5;
const errorsWithoutStacks = new WeakSet<Error>();

/**
 * Applies the HTTP status stack policy before Pino invokes its serializer.
 * The WeakSet keeps this policy private and avoids adding logging metadata to
 * application Error objects.
 */
export function applyHttpErrorStackPolicy(error: Error, status: number, isProduction: boolean): void {
  if (isProduction && status < 500) {
    errorsWithoutStacks.add(error);
  }
}

/**
 * Serializes only explicitly allowlisted native Error information.
 */
export function pinoErrorSerializer(value: unknown): SerializedPinoError {
  if (!(value instanceof Error)) {
    return {
      type: 'Error',
      message: 'A non-Error value was supplied as err.',
    };
  }

  return serializeError(value, 0, new Set<Error>(), !errorsWithoutStacks.has(value));
}

function serializeError(error: Error, depth: number, seen: Set<Error>, includeStack: boolean): SerializedPinoError {
  seen.add(error);

  const serialized: SerializedPinoError = {
    type: readString(error, 'name') || 'Error',
    message: readString(error, 'message') || '',
  };

  const code = readValue(error, 'code');
  if (typeof code === 'string' || (typeof code === 'number' && Number.isFinite(code))) {
    serialized.code = code;
  }

  if (includeStack) {
    const stack = readString(error, 'stack');
    if (stack) {
      serialized.stack = stack;
    }
  }

  const cause = readValue(error, 'cause');
  if (cause === undefined) {
    return serialized;
  }

  if (cause instanceof Error) {
    if (seen.has(cause)) {
      serialized.causeTruncated = 'circular';
      return serialized;
    }

    if (depth >= MAX_CAUSE_DEPTH) {
      serialized.causeTruncated = 'max_depth';
      return serialized;
    }

    serialized.cause = serializeError(cause, depth + 1, seen, includeStack);
    return serialized;
  }

  serialized.cause = serializeOpaqueCause(cause);
  return serialized;
}

function serializeOpaqueCause(cause: unknown): string | number | boolean | null | { type: string; value?: string } {
  if (cause === null || typeof cause === 'string' || typeof cause === 'boolean') {
    return cause;
  }

  if (typeof cause === 'number') {
    return Number.isFinite(cause) ? cause : { type: 'number', value: String(cause) };
  }

  if (typeof cause === 'bigint') {
    return { type: 'bigint', value: cause.toString() };
  }

  if (typeof cause === 'symbol') {
    return { type: 'symbol' };
  }

  return { type: typeof cause === 'function' ? 'function' : 'object' };
}

function readString(error: Error, key: 'name' | 'message' | 'stack'): string | undefined {
  const value = readValue(error, key);
  return typeof value === 'string' ? value : undefined;
}

function readValue(error: Error, key: 'name' | 'message' | 'stack' | 'code' | 'cause'): unknown {
  try {
    return (error as Error & Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}
