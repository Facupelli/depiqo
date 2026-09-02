export interface GeocodedLocation {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street?: string;
  streetNumber?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
  country?: string;
  providerPlaceId?: string;
}

export type AddressGeocodingResult =
  | { outcome: 'RESOLVED'; location: GeocodedLocation }
  | { outcome: 'UNRESOLVED' }
  | { outcome: 'AMBIGUOUS' };
