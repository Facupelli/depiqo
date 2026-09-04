import { PrismaService } from 'src/core/database/prisma.service';

const MAXIMUM_DISTANCE_METERS = 20_000;

export function persistServiceableBranchDeliveryConfiguration(input: {
  prisma: PrismaService;
  tenantId: string;
  branchId: string;
}) {
  return input.prisma.client.v2BranchDeliveryConfiguration.create({
    data: {
      tenantId: input.tenantId,
      branchId: input.branchId,
      enabled: true,
      currency: 'USD',
      maximumDistanceMeters: MAXIMUM_DISTANCE_METERS,
      eligibleWeekdays: [0, 1, 2, 3, 4, 5, 6],
      eligibilityStartMinute: 0,
      eligibilityEndMinute: 1_439,
      normalServiceStartMinute: 0,
      normalServiceEndMinute: 1_439,
      specialHoursSurcharge: '0.00',
      transportReservationMinutes: 30,
      distancePriceBands: {
        create: {
          maxDistanceMeters: MAXIMUM_DISTANCE_METERS,
          price: '25.00',
        },
      },
    },
  });
}
