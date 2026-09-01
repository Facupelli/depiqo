export type DeliveryProviderOperation = 'resolveCustomerLocation' | 'getDrivingDistance';

export class DeliveryProviderError extends Error {
  constructor(
    public readonly provider: string,
    public readonly operation: DeliveryProviderOperation,
    message: string,
    cause?: unknown,
  ) {
    super(message, cause === undefined ? undefined : { cause });
    this.name = 'DeliveryProviderError';
  }
}
