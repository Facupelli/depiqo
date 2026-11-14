export interface GeocodedLocation {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  name?: string;
  categories?: readonly string[];
  street?: string;
  streetNumber?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
  country?: string;
  providerPlaceId?: string;
}
