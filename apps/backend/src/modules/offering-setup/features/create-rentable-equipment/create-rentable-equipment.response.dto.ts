import { CreateRentableEquipmentResponseSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class CreateRentableEquipmentResponseDto extends createZodDto(CreateRentableEquipmentResponseSchema) {}
