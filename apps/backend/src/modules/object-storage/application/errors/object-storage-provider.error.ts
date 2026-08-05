export type ObjectStorageOperation = 'putObject' | 'getObjectBuffer' | 'getObjectStream';

export class ObjectStorageProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly operation: ObjectStorageOperation,
    public readonly target: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'ObjectStorageProviderError';
  }
}
