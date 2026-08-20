import { GetEquipmentTypeProductUsagesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetEquipmentTypeProductUsagesRequestDto extends createZodDto(GetEquipmentTypeProductUsagesQuerySchema) {}
