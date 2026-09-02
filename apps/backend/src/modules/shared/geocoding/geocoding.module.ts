import { Module } from '@nestjs/common';

import { AddressGeocoder } from './address-geocoder.port';
import { MapboxAddressGeocoderAdapter } from './mapbox/mapbox-address-geocoder.adapter';
import { MapboxGeocodingHttpClient } from './mapbox/mapbox-http.client';

@Module({
  providers: [
    MapboxGeocodingHttpClient,
    MapboxAddressGeocoderAdapter,
    { provide: AddressGeocoder, useExisting: MapboxAddressGeocoderAdapter },
  ],
  exports: [AddressGeocoder],
})
export class GeocodingModule {}
