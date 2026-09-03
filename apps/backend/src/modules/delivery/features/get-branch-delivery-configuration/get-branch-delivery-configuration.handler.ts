import type { GetBranchDeliveryConfigurationResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { BranchFacts } from '../../../tenant-management/public-api/branch-facts.public-api';

import {
  GetBranchDeliveryConfigurationError,
  getBranchDeliveryConfigurationError,
} from './get-branch-delivery-configuration.errors';
import { GetBranchDeliveryConfigurationQuery } from './get-branch-delivery-configuration.query';

export type GetBranchDeliveryConfigurationResult = Result<
  GetBranchDeliveryConfigurationResponseDto,
  GetBranchDeliveryConfigurationError
>;

@QueryHandler(GetBranchDeliveryConfigurationQuery)
export class GetBranchDeliveryConfigurationHandler implements IQueryHandler<
  GetBranchDeliveryConfigurationQuery,
  GetBranchDeliveryConfigurationResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly branchFacts: BranchFacts,
  ) {}

  async execute(query: GetBranchDeliveryConfigurationQuery): Promise<GetBranchDeliveryConfigurationResult> {
    const context = {
      useCase: 'GetBranchDeliveryConfiguration',
      tenantId: query.tenantId,
      branchId: query.branchId,
    };
    const branch = await this.branchFacts.getBranchFacts({ tenantId: query.tenantId, branchId: query.branchId });

    if (branch.isErr()) {
      if (branch.error.code === 'BranchNotFound') {
        return err(
          getBranchDeliveryConfigurationError(
            'delivery.branch_not_found',
            `Branch "${query.branchId}" was not found.`,
            branch.error,
            context,
          ),
        );
      }

      throw branch.error;
    }

    const configuration = await this.prisma.client.v2BranchDeliveryConfiguration.findUnique({
      where: { tenantId_branchId: { tenantId: query.tenantId, branchId: query.branchId } },
      select: {
        enabled: true,
        currency: true,
        maximumDistanceMeters: true,
        eligibleWeekdays: true,
        eligibilityStartMinute: true,
        eligibilityEndMinute: true,
        normalServiceStartMinute: true,
        normalServiceEndMinute: true,
        specialHoursSurcharge: true,
        transportReservationMinutes: true,
        distancePriceBands: {
          select: { maxDistanceMeters: true, price: true },
          orderBy: { maxDistanceMeters: 'asc' },
        },
      },
    });

    if (!configuration) return ok(null);

    return ok({
      enabled: configuration.enabled,
      currency: configuration.currency,
      maximumDistanceMeters: configuration.maximumDistanceMeters,
      eligibleWeekdays: configuration.eligibleWeekdays,
      eligibilityStartMinute: configuration.eligibilityStartMinute,
      eligibilityEndMinute: configuration.eligibilityEndMinute,
      normalServiceStartMinute: configuration.normalServiceStartMinute,
      normalServiceEndMinute: configuration.normalServiceEndMinute,
      specialHoursSurcharge: String(configuration.specialHoursSurcharge),
      transportReservationMinutes: configuration.transportReservationMinutes,
      distancePriceBands: configuration.distancePriceBands.map((band) => ({
        maxDistanceMeters: band.maxDistanceMeters,
        price: String(band.price),
      })),
    });
  }
}
