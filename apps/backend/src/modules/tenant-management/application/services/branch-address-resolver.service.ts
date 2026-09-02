import { Injectable } from '@nestjs/common';

import { AddressGeocoder } from '../../../shared/geocoding/address-geocoder.port';
import type { GeocodedLocation } from '../../../shared/geocoding/geocoded-location';
import { BranchOperationalLocationProps } from '../../domain/value-objects/branch-operational-location.value-object';

export type BranchAddressResolution =
  | {
      outcome: 'RESOLVED';
      address: string | null;
      operationalLocation: BranchOperationalLocationProps | null;
    }
  | { outcome: 'UNRESOLVED' };

export interface ResolveBranchAddressInput {
  address: string | null;
  addressLocationId?: string | null;
  currentAddress?: string | null;
  currentOperationalLocation?: BranchOperationalLocationProps | null;
}

@Injectable()
export class BranchAddressResolver {
  constructor(private readonly addressGeocoder: AddressGeocoder) {}

  normalize(value: string | null | undefined): string | null {
    return value?.trim() || null;
  }

  async resolve(input: ResolveBranchAddressInput): Promise<BranchAddressResolution> {
    const addressLocationId = this.normalize(input.addressLocationId);
    if (addressLocationId !== null) {
      const location = await this.addressGeocoder.resolve({ locationId: addressLocationId });
      if (location === null) return { outcome: 'UNRESOLVED' };

      return this.resolvedLocation(location.formattedAddress, location);
    }

    const address = this.normalize(input.address);
    if (address === null) {
      return { outcome: 'RESOLVED', address: null, operationalLocation: null };
    }

    if (
      address === this.normalize(input.currentAddress) &&
      input.currentOperationalLocation != null
    ) {
      return {
        outcome: 'RESOLVED',
        address,
        operationalLocation: input.currentOperationalLocation,
      };
    }

    return { outcome: 'UNRESOLVED' };
  }

  private resolvedLocation(address: string, location: GeocodedLocation): BranchAddressResolution {
    return {
      outcome: 'RESOLVED',
      address,
      operationalLocation: {
        formattedAddress: location.formattedAddress,
        latitude: location.latitude,
        longitude: location.longitude,
        street: location.street,
        streetNumber: location.streetNumber,
        city: location.city,
        stateRegion: location.stateRegion,
        postalCode: location.postalCode,
        country: location.country,
        providerPlaceId: location.providerPlaceId,
      },
    };
  }
}
