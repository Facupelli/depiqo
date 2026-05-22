export class GetOrderAccessoryPreparationQuery {
  constructor(
    public readonly tenantId: string,
    public readonly orderId: string,
  ) {}
}
