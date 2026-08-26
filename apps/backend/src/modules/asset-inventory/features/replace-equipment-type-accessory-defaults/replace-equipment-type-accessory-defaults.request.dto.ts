import {
  ReplaceEquipmentTypeAccessoryDefaultsBodySchema,
  ReplaceEquipmentTypeAccessoryDefaultsParamsSchema,
} from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ReplaceEquipmentTypeAccessoryDefaultsRequestDto extends createZodDto(
  ReplaceEquipmentTypeAccessoryDefaultsBodySchema,
) {}

export class ReplaceEquipmentTypeAccessoryDefaultsParamsDto extends createZodDto(
  ReplaceEquipmentTypeAccessoryDefaultsParamsSchema,
) {}
