import { ListEquipmentTypesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class ListEquipmentTypesRequestDto extends createZodDto(ListEquipmentTypesQuerySchema) {}
