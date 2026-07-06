import { CreateEquipmentTypeResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateEquipmentTypeResponseDto extends createZodDto(CreateEquipmentTypeResponseSchema) {}
