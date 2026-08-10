import { V2RentalStatus } from 'src/generated/prisma/enums';

export interface RentalRemitoSourceReadModel {
  rental: {
    id: string;
    tenantId: string;
    branchId: string;
    customerId: string | null;
    status: V2RentalStatus;
    periodStart: Date;
    periodEnd: Date;
    priceSnapshot: unknown;
    bookingSnapshot: unknown;
    insuranceSelected: boolean;
    confirmedAt: Date | null;
  };

  tenant: {
    id: string;
    name: string;
    slug: string;
    config: unknown;
    branding: {
      logoUrl: string | null;
    } | null;
  };

  branch: {
    id: string;
    name: string;
    timezone: string;
  };

  customer: {
    id: string;
    email: string | null;
    displayName: string;
    phone: string | null;
    documentNumber: string | null;
    address: string | null;
  } | null;

  contractSigner: {
    fullName: string;
    documentNumber: string;
    phone: string | null;
    address: string | null;
    signatureUrl: string | null;
  } | null;

  equipmentLines: RentalRemitoSourceEquipmentLine[];
  accessoryLines: RentalRemitoSourceAccessoryLine[];
}

export interface RentalRemitoSourceEquipmentLine {
  id: string;
  name: string;
  quantity: number;
}

export interface RentalRemitoSourceAccessoryLine {
  id: string;
  sourceRentalDemandLineId: string | null;
  name: string;
  quantity: number;
}
