import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { SearchBranchAddressSuggestionsResult } from './search-branch-address-suggestions.handler';
import { SearchBranchAddressSuggestionsQuery } from './search-branch-address-suggestions.query';
import { SearchBranchAddressSuggestionsRequestDto } from './search-branch-address-suggestions.request.dto';
import type { SearchBranchAddressSuggestionsResponseDto } from './search-branch-address-suggestions.response.dto';

@Controller('tenant-management/branches')
export class SearchBranchAddressSuggestionsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('address-suggestions')
  async search(
    @Query() dto: SearchBranchAddressSuggestionsRequestDto,
  ): Promise<SearchBranchAddressSuggestionsResponseDto> {
    return this.queryBus.execute<
      SearchBranchAddressSuggestionsQuery,
      SearchBranchAddressSuggestionsResult
    >(new SearchBranchAddressSuggestionsQuery(dto.text));
  }
}
