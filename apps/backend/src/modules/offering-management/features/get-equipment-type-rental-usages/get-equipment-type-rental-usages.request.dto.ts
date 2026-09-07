import { GetEquipmentTypeRentalUsagesParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetEquipmentTypeRentalUsagesParamsDto extends createZodDto(GetEquipmentTypeRentalUsagesParamsSchema) {}
