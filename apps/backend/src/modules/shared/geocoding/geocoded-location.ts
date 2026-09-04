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
