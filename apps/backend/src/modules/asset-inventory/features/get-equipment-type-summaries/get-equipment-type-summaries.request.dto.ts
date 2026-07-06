import { GetEquipmentTypeSummariesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetEquipmentTypeSummariesRequestDto extends createZodDto(GetEquipmentTypeSummariesQuerySchema) {}
