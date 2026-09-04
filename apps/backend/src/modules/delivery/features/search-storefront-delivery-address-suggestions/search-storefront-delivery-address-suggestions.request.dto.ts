import { SearchStorefrontDeliveryAddressSuggestionsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class SearchStorefrontDeliveryAddressSuggestionsRequestDto extends createZodDto(
  SearchStorefrontDeliveryAddressSuggestionsQuerySchema,
) {}
