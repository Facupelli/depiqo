import { GetRentableItemSummariesQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentableItemSummariesRequestDto extends createZodDto(GetRentableItemSummariesQuerySchema) {}
