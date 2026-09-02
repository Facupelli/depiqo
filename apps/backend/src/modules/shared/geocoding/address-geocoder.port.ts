import { AddressGeocodingResult } from './geocoded-location';

export interface GeocodeAddressInput {
  address: string;
}

export abstract class AddressGeocoder {
  abstract geocode(input: GeocodeAddressInput): Promise<AddressGeocodingResult>;
}
