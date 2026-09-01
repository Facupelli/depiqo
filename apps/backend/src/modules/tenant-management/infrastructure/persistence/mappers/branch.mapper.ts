import { Prisma, V2BranchSchedule as PrismaBranchSchedule } from 'src/generated/prisma/client';

import { localDateToPrismaDate, prismaDateToLocalDate } from 'src/core/temporal/local-date';

import { Branch } from '../../../domain/entities/branch.aggregate';
import { BranchSchedule, BranchScheduleSlotType } from '../../../domain/entities/branch-schedule.entity';

type PrismaBranchWithSchedules = Prisma.V2BranchGetPayload<{
  include: { schedules: true };
}>;

export class BranchMapper {
  static toDomain(raw: PrismaBranchWithSchedules): Branch {
    return Branch.reconstitute({
      id: raw.id,
      tenantId: raw.tenantId,
      name: raw.name,
      address: raw.address,
      operationalLocation:
        raw.operationalLocationFormattedAddress !== null &&
        raw.operationalLocationLatitude !== null &&
        raw.operationalLocationLongitude !== null
          ? {
              formattedAddress: raw.operationalLocationFormattedAddress,
              latitude: raw.operationalLocationLatitude,
              longitude: raw.operationalLocationLongitude,
              street: raw.operationalLocationStreet,
              streetNumber: raw.operationalLocationStreetNumber,
              city: raw.operationalLocationCity,
              stateRegion: raw.operationalLocationStateRegion,
              postalCode: raw.operationalLocationPostalCode,
              country: raw.operationalLocationCountry,
              providerPlaceId: raw.operationalLocationProviderPlaceId,
            }
          : null,
      timezone: raw.timezone,
      isActive: raw.isActive,
      supportsDelivery: raw.supportsDelivery,
      deliveryDefaultCountry: raw.deliveryDefaultCountry,
      deliveryDefaultStateRegion: raw.deliveryDefaultStateRegion,
      deliveryDefaultCity: raw.deliveryDefaultCity,
      deliveryDefaultPostalCode: raw.deliveryDefaultPostalCode,
      schedules: raw.schedules.map(BranchScheduleMapper.toDomain),
    });
  }

  static toPersistence(entity: Branch): Prisma.V2BranchUncheckedCreateInput {
    const location = entity.getOperationalLocation();
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      name: entity.getName(),
      address: entity.getAddress(),
      ...this.toOperationalLocationPersistence(location),
      timezone: entity.getTimezone(),
      isActive: entity.active,
      supportsDelivery: entity.supportsDeliveryEnabled,
      deliveryDefaultCountry: entity.getDeliveryDefaults().country,
      deliveryDefaultStateRegion: entity.getDeliveryDefaults().stateRegion,
      deliveryDefaultCity: entity.getDeliveryDefaults().city,
      deliveryDefaultPostalCode: entity.getDeliveryDefaults().postalCode,
      schedules: {
        create: entity.getSchedules().map(BranchScheduleMapper.toNestedPersistence),
      },
    };
  }

  static toUpdateData(entity: Branch): Prisma.V2BranchUncheckedUpdateInput {
    const location = entity.getOperationalLocation();
    return {
      name: entity.getName(),
      address: entity.getAddress(),
      ...this.toOperationalLocationPersistence(location),
      timezone: entity.getTimezone(),
      supportsDelivery: entity.supportsDeliveryEnabled,
      deliveryDefaultCountry: entity.getDeliveryDefaults().country,
      deliveryDefaultStateRegion: entity.getDeliveryDefaults().stateRegion,
      deliveryDefaultCity: entity.getDeliveryDefaults().city,
      deliveryDefaultPostalCode: entity.getDeliveryDefaults().postalCode,
    };
  }

  static toSchedulePersistence(entity: BranchSchedule): Prisma.V2BranchScheduleCreateManyInput {
    return BranchScheduleMapper.toPersistence(entity);
  }

  private static toOperationalLocationPersistence(location: ReturnType<Branch['getOperationalLocation']>) {
    return {
      operationalLocationFormattedAddress: location?.formattedAddress ?? null,
      operationalLocationLatitude: location?.latitude ?? null,
      operationalLocationLongitude: location?.longitude ?? null,
      operationalLocationStreet: location?.street ?? null,
      operationalLocationStreetNumber: location?.streetNumber ?? null,
      operationalLocationCity: location?.city ?? null,
      operationalLocationStateRegion: location?.stateRegion ?? null,
      operationalLocationPostalCode: location?.postalCode ?? null,
      operationalLocationCountry: location?.country ?? null,
      operationalLocationProviderPlaceId: location?.providerPlaceId ?? null,
    };
  }
}

export class BranchScheduleMapper {
  static toDomain(raw: PrismaBranchSchedule): BranchSchedule {
    return BranchSchedule.reconstitute({
      id: raw.id,
      branchId: raw.branchId,
      type: raw.type as BranchScheduleSlotType,
      dayOfWeek: raw.dayOfWeek,
      specificDate: raw.specificDate ? prismaDateToLocalDate(raw.specificDate) : null,
      window: {
        openTime: raw.openTime,
        closeTime: raw.closeTime,
        slotIntervalMinutes: raw.slotIntervalMinutes,
      },
    });
  }

  static toPersistence(entity: BranchSchedule): Prisma.V2BranchScheduleUncheckedCreateInput {
    return {
      id: entity.id,
      branchId: entity.branchId,
      type: entity.type,
      dayOfWeek: entity.dayOfWeek,
      specificDate: entity.specificDate ? localDateToPrismaDate(entity.specificDate) : null,
      openTime: entity.getWindow().openTime,
      closeTime: entity.getWindow().closeTime,
      slotIntervalMinutes: entity.getWindow().slotIntervalMinutes,
    };
  }

  static toNestedPersistence(entity: BranchSchedule): Prisma.V2BranchScheduleUncheckedCreateWithoutBranchInput {
    return {
      id: entity.id,
      type: entity.type,
      dayOfWeek: entity.dayOfWeek,
      specificDate: entity.specificDate ? localDateToPrismaDate(entity.specificDate) : null,
      openTime: entity.getWindow().openTime,
      closeTime: entity.getWindow().closeTime,
      slotIntervalMinutes: entity.getWindow().slotIntervalMinutes,
    };
  }
}
