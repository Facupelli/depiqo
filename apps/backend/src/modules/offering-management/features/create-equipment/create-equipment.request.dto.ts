import { CreateEquipmentBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateEquipmentRequestDto extends createZodDto(CreateEquipmentBodySchema) {}
