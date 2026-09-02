import { SearchBranchAddressSuggestionsQuerySchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';

export class SearchBranchAddressSuggestionsRequestDto extends createZodDto(
  SearchBranchAddressSuggestionsQuerySchema,
) {}
