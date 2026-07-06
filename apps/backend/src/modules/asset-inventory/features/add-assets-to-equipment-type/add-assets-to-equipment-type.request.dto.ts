import { AddAssetsToEquipmentTypeBodySchema, AddAssetsToEquipmentTypeParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AddAssetsToEquipmentTypeRequestDto extends createZodDto(AddAssetsToEquipmentTypeBodySchema) {}

export class AddAssetsToEquipmentTypeParamsDto extends createZodDto(AddAssetsToEquipmentTypeParamsSchema) {}
