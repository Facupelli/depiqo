import { Injectable } from '@nestjs/common';

import { AddressGeocoder } from '../../../shared/geocoding/address-geocoder.port';
import { BranchOperationalLocationProps } from '../../domain/value-objects/branch-operational-location.value-object';

export type BranchAddressResolution =
  | {
      outcome: 'RESOLVED';
      address: string | null;
      operationalLocation: BranchOperationalLocationProps | null;
    }
  | { outcome: 'UNRESOLVED' }
  | { outcome: 'AMBIGUOUS' };

@Injectable()
export class BranchAddressResolver {
  constructor(private readonly addressGeocoder: AddressGeocoder) {}

  normalize(address: string | null): string | null {
    return address?.trim() || null;
  }

  async resolve(address: string | null): Promise<BranchAddressResolution> {
    const normalizedAddress = this.normalize(address);
    if (normalizedAddress === null) {
      return { outcome: 'RESOLVED', address: null, operationalLocation: null };
    }

    const result = await this.addressGeocoder.geocode({ address: normalizedAddress });
    if (result.outcome !== 'RESOLVED') return result;

    return {
      outcome: 'RESOLVED',
      address: normalizedAddress,
      operationalLocation: {
        formattedAddress: result.location.formattedAddress,
        latitude: result.location.latitude,
        longitude: result.location.longitude,
        street: result.location.street,
        streetNumber: result.location.streetNumber,
        city: result.location.city,
        stateRegion: result.location.stateRegion,
        postalCode: result.location.postalCode,
        country: result.location.country,
        providerPlaceId: result.location.providerPlaceId,
      },
    };
  }
}
