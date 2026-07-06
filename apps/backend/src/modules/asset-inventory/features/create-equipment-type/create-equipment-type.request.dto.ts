import { CreateEquipmentTypeBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateEquipmentTypeRequestDto extends createZodDto(CreateEquipmentTypeBodySchema) {}
