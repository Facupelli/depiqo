import { Prisma, V2BranchSchedule as PrismaBranchSchedule } from 'src/generated/prisma/client';

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
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      name: entity.getName(),
      address: entity.getAddress(),
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
    return {
      name: entity.getName(),
      address: entity.getAddress(),
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
}

export class BranchScheduleMapper {
  static toDomain(raw: PrismaBranchSchedule): BranchSchedule {
    return BranchSchedule.reconstitute({
      id: raw.id,
      branchId: raw.branchId,
      type: raw.type as BranchScheduleSlotType,
      dayOfWeek: raw.dayOfWeek,
      specificDate: raw.specificDate,
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
      specificDate: entity.specificDate,
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
      specificDate: entity.specificDate,
      openTime: entity.getWindow().openTime,
      closeTime: entity.getWindow().closeTime,
      slotIntervalMinutes: entity.getWindow().slotIntervalMinutes,
    };
  }
}
