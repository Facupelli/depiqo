import { AddAssetsToEquipmentTypeResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class AddAssetsToEquipmentTypeResponseDto extends createZodDto(AddAssetsToEquipmentTypeResponseSchema) {}
