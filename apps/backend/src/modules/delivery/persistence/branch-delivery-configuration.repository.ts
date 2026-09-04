import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { BranchDeliveryConfiguration } from '../domain/branch-delivery-configuration.aggregate';
import { BranchDeliveryConfigurationMapper } from './branch-delivery-configuration.mapper';

type BranchDeliveryConfigurationPersistenceClient = Pick<PrismaService['client'], 'v2BranchDeliveryConfiguration'>;

@Injectable()
export class BranchDeliveryConfigurationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByTenantAndBranch(
    tenantId: string,
    branchId: string,
    client: BranchDeliveryConfigurationPersistenceClient = this.prisma.client,
  ): Promise<BranchDeliveryConfiguration | null> {
    const record = await client.v2BranchDeliveryConfiguration.findUnique({
      where: { tenantId_branchId: { tenantId, branchId } },
      include: { distancePriceBands: { orderBy: { maxDistanceMeters: 'asc' } } },
    });

    return record ? BranchDeliveryConfigurationMapper.toDomain(record) : null;
  }

  async findById(
    id: string,
    tenantId: string,
    client: BranchDeliveryConfigurationPersistenceClient = this.prisma.client,
  ): Promise<BranchDeliveryConfiguration | null> {
    const record = await client.v2BranchDeliveryConfiguration.findFirst({
      where: { id, tenantId },
      include: { distancePriceBands: { orderBy: { maxDistanceMeters: 'asc' } } },
    });

    return record ? BranchDeliveryConfigurationMapper.toDomain(record) : null;
  }

  async save(
    configuration: BranchDeliveryConfiguration,
    client: BranchDeliveryConfigurationPersistenceClient = this.prisma.client,
  ): Promise<void> {
    await client.v2BranchDeliveryConfiguration.upsert({
      where: { id: configuration.id },
      create: BranchDeliveryConfigurationMapper.toCreateData(configuration),
      update: {
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
          deleteMany: {},
          create: configuration.distancePriceBands.map((band) => ({
            maxDistanceMeters: band.maxDistanceMeters,
            price: band.price.toString(),
          })),
        },
      },
    });
  }
}
