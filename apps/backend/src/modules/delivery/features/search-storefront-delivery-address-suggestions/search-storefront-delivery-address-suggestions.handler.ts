import type { SearchStorefrontDeliveryAddressSuggestionsResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { AddressGeocoder } from '../../../shared/geocoding/address-geocoder.port';
import { SearchStorefrontDeliveryAddressSuggestionsQuery } from './search-storefront-delivery-address-suggestions.query';

export type SearchStorefrontDeliveryAddressSuggestionsResult =
  SearchStorefrontDeliveryAddressSuggestionsResponseDto;

@QueryHandler(SearchStorefrontDeliveryAddressSuggestionsQuery)
export class SearchStorefrontDeliveryAddressSuggestionsHandler
  implements
    IQueryHandler<
      SearchStorefrontDeliveryAddressSuggestionsQuery,
      SearchStorefrontDeliveryAddressSuggestionsResult
    >
{
  constructor(private readonly addressGeocoder: AddressGeocoder) {}

  async execute(
    query: SearchStorefrontDeliveryAddressSuggestionsQuery,
  ): Promise<SearchStorefrontDeliveryAddressSuggestionsResult> {
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
