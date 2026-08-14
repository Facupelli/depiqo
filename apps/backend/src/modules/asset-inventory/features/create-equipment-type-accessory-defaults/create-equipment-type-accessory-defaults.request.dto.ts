import {
  CreateEquipmentTypeAccessoryDefaultsBodySchema,
  CreateEquipmentTypeAccessoryDefaultsParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateEquipmentTypeAccessoryDefaultsRequestDto extends createZodDto(
  CreateEquipmentTypeAccessoryDefaultsBodySchema,
) {}

export class CreateEquipmentTypeAccessoryDefaultsParamsDto extends createZodDto(
  CreateEquipmentTypeAccessoryDefaultsParamsSchema,
) {}
