import type { SearchBranchAddressSuggestionsResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AddressGeocoder } from '../../../shared/geocoding/address-geocoder.port';
import { SearchBranchAddressSuggestionsQuery } from './search-branch-address-suggestions.query';

export type SearchBranchAddressSuggestionsResult = SearchBranchAddressSuggestionsResponseDto;

@QueryHandler(SearchBranchAddressSuggestionsQuery)
export class SearchBranchAddressSuggestionsHandler
  implements IQueryHandler<SearchBranchAddressSuggestionsQuery, SearchBranchAddressSuggestionsResult>
{
  constructor(private readonly addressGeocoder: AddressGeocoder) {}

  async execute(query: SearchBranchAddressSuggestionsQuery): Promise<SearchBranchAddressSuggestionsResult> {
    const suggestions = await this.addressGeocoder.search({ text: query.text });

    return {
      suggestions: suggestions.map((suggestion) => ({
        locationId: suggestion.locationId,
        formattedAddress: suggestion.formattedAddress,
        ...(suggestion.addressLine1 === undefined ? {} : { addressLine1: suggestion.addressLine1 }),
        ...(suggestion.addressLine2 === undefined ? {} : { addressLine2: suggestion.addressLine2 }),
      })),
    };
  }
}
