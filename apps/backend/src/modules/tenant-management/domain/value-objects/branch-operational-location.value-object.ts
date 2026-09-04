import { err, ok, Result } from 'neverthrow';

import { InvalidBranchOperationalLocationError, TenantManagementError } from '../errors/tenant-management.errors';

export interface BranchOperationalLocationProps {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street?: string | null;
  streetNumber?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  postalCode?: string | null;
  country?: string | null;
  providerPlaceId?: string | null;
}

export interface BranchOperationalLocationValue {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street: string | null;
  streetNumber: string | null;
  city: string | null;
  stateRegion: string | null;
  postalCode: string | null;
  country: string | null;
  providerPlaceId: string | null;
}

export class BranchOperationalLocation {
  private constructor(private readonly value: BranchOperationalLocationValue) {}

  static create(props: BranchOperationalLocationProps): Result<BranchOperationalLocation, TenantManagementError> {
    const formattedAddress = props.formattedAddress.trim();
    if (!formattedAddress) {
      return err(new InvalidBranchOperationalLocationError('formattedAddress must not be empty.'));
    }
    if (!Number.isFinite(props.latitude) || props.latitude < -90 || props.latitude > 90) {
      return err(new InvalidBranchOperationalLocationError('latitude must be finite and between -90 and 90.'));
    }
    if (!Number.isFinite(props.longitude) || props.longitude < -180 || props.longitude > 180) {
      return err(new InvalidBranchOperationalLocationError('longitude must be finite and between -180 and 180.'));
    }

    return ok(
      new BranchOperationalLocation({
        formattedAddress,
        latitude: props.latitude,
        longitude: props.longitude,
        street: this.normalizeOptionalString(props.street),
        streetNumber: this.normalizeOptionalString(props.streetNumber),
        city: this.normalizeOptionalString(props.city),
        stateRegion: this.normalizeOptionalString(props.stateRegion),
        postalCode: this.normalizeOptionalString(props.postalCode),
        country: this.normalizeOptionalString(props.country),
        providerPlaceId: this.normalizeOptionalString(props.providerPlaceId),
      }),
    );
  }

  static reconstitute(props: BranchOperationalLocationValue): BranchOperationalLocation {
    return new BranchOperationalLocation(props);
  }

  toValue(): BranchOperationalLocationValue {
    return { ...this.value };
  }

  private static normalizeOptionalString(value: string | null | undefined): string | null {
    return value?.trim() || null;
  }
}
