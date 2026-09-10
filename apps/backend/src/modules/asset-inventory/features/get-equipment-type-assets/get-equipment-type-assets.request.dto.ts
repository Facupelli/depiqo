import { GetEquipmentTypeAssetsParamsSchema, GetEquipmentTypeAssetsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetEquipmentTypeAssetsParamsDto extends createZodDto(GetEquipmentTypeAssetsParamsSchema) {}

export class GetEquipmentTypeAssetsRequestDto extends createZodDto(GetEquipmentTypeAssetsQuerySchema) {}
