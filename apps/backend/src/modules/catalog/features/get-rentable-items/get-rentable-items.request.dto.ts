import { GetRentableItemsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class GetRentableItemsRequestDto extends createZodDto(GetRentableItemsQuerySchema) {}
