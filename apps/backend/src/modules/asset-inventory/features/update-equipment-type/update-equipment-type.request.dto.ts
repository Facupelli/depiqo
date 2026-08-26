import { UpdateEquipmentTypeBodySchema, UpdateEquipmentTypeParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';
export class UpdateEquipmentTypeParamsDto extends createZodDto(UpdateEquipmentTypeParamsSchema) {}
export class UpdateEquipmentTypeRequestDto extends createZodDto(UpdateEquipmentTypeBodySchema) {}
