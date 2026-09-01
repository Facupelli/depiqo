import { Prisma } from 'src/generated/prisma/client';

import { BranchDeliveryConfiguration } from '../domain/branch-delivery-configuration.aggregate';

type BranchDeliveryConfigurationRecord = Prisma.V2BranchDeliveryConfigurationGetPayload<{
  include: { distancePriceBands: true };
}>;

export class BranchDeliveryConfigurationMapper {
  static toDomain(record: BranchDeliveryConfigurationRecord): BranchDeliveryConfiguration {
    const configuration = BranchDeliveryConfiguration.reconstitute({
      id: record.id,
      tenantId: record.tenantId,
      branchId: record.branchId,
      enabled: record.enabled,
      currency: record.currency,
      maximumDistanceMeters: record.maximumDistanceMeters,
      distancePriceBands: record.distancePriceBands.map((band) => ({
        maxDistanceMeters: band.maxDistanceMeters,
        price: String(band.price),
      })),
      eligibleWeekdays: record.eligibleWeekdays,
      eligibilityStartMinute: record.eligibilityStartMinute,
      eligibilityEndMinute: record.eligibilityEndMinute,
      normalServiceStartMinute: record.normalServiceStartMinute,
      normalServiceEndMinute: record.normalServiceEndMinute,
      specialHoursSurcharge: String(record.specialHoursSurcharge),
      transportReservationMinutes: record.transportReservationMinutes,
    });

    if (configuration.isErr()) throw configuration.error;
    return configuration.value;
  }

  static toCreateData(configuration: BranchDeliveryConfiguration): Prisma.V2BranchDeliveryConfigurationCreateInput {
    return {
      id: configuration.id,
      tenantId: configuration.tenantId,
      branchId: configuration.branchId,
      enabled: configuration.enabled,
      currency: configuration.currency.value,
      maximumDistanceMeters: configuration.maximumDistanceMeters,
      eligibleWeekdays: [...configuration.eligibleWeekdays],
      eligibilityStartMinute: configuration.eligibilityWindow.startMinute,
      eligibilityEndMinute: configuration.eligibilityWindow.endMinute,
      normalServiceStartMinute: configuration.normalServiceWindow.startMinute,
      normalServiceEndMinute: configuration.normalServiceWindow.endMinute,
      specialHoursSurcharge: configuration.specialHoursSurcharge.toString(),
      transportReservationMinutes: configuration.transportReservationMinutes,
      distancePriceBands: {
        create: configuration.distancePriceBands.map((band) => ({
          maxDistanceMeters: band.maxDistanceMeters,
          price: band.price.toString(),
        })),
      },
    };
  }
}
