import { IQuery } from '@nestjs/cqrs';

export class GetEquipmentTypeProductUsagesQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly equipmentTypeIds: string[],
  ) {}
}
