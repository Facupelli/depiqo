import { GeocodedLocation } from './geocoded-location';

export type AddressSuggestion = {
  locationId: string;
  formattedAddress: string;
  addressLine1?: string;
  addressLine2?: string;
};

export type SearchAddressesInput = {
  text: string;
};

export type ResolveAddressInput = {
  locationId: string;
};

export abstract class AddressGeocoder {
  abstract search(
    input: SearchAddressesInput,
  ): Promise<readonly AddressSuggestion[]>;

  abstract resolve(
    input: ResolveAddressInput,
  ): Promise<GeocodedLocation | null>;
}
