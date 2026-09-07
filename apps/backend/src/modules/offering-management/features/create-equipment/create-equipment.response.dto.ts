import { CreateEquipmentResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateEquipmentResponseDto extends createZodDto(CreateEquipmentResponseSchema) {}
