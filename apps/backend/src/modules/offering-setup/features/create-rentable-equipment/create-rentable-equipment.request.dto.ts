import { CreateRentableEquipmentBodySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRentableEquipmentRequestDto extends createZodDto(CreateRentableEquipmentBodySchema) {}
