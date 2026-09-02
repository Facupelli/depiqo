import { Module } from '@nestjs/common';

import { AddressGeocoder } from './address-geocoder.port';
import { GeoapifyAddressGeocoderAdapter } from './geoapify/geoapify-address-geocoder.adapter';
import { GeoapifyGeocodingHttpClient } from './geoapify/geoapify-geocoding-http.client';

@Module({
  providers: [
    GeoapifyGeocodingHttpClient,
    GeoapifyAddressGeocoderAdapter,
    {
      provide: AddressGeocoder,
      useExisting: GeoapifyAddressGeocoderAdapter,
    },
  ],
  exports: [AddressGeocoder],
})
export class GeocodingModule {}
