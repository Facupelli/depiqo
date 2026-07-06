import { SearchRentalOffersQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class SearchRentalOffersRequestDto extends createZodDto(SearchRentalOffersQuerySchema) {}
