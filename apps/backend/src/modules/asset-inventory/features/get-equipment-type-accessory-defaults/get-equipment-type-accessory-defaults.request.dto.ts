import { GetEquipmentTypeAccessoryDefaultsParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetEquipmentTypeAccessoryDefaultsParamsDto extends createZodDto(
  GetEquipmentTypeAccessoryDefaultsParamsSchema,
) {}
