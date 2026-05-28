import { GetEquipmentTypesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetEquipmentTypesRequestDto extends createZodDto(GetEquipmentTypesQuerySchema) {}
