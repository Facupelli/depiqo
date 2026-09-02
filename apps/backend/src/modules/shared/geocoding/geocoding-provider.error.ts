export class GeocodingProviderError extends Error {
  constructor(
    public readonly provider: string,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'GeocodingProviderError';
  }
}
