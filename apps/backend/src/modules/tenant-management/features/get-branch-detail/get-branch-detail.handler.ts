import type { BranchOperationalLocationDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { prismaDateToLocalDate } from 'src/core/temporal/local-date';

import { GetBranchDetailError, getBranchDetailError } from './get-branch-detail.errors';
import { GetBranchDetailQuery } from './get-branch-detail.query';

export interface GetBranchDetailScheduleReadModel {
  id: string;
  type: 'PICKUP' | 'RETURN';
  dayOfWeek: number | null;
  specificDate: string | null;
  openTime: number;
  closeTime: number;
  slotIntervalMinutes: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetBranchDetailReadModel {
  id: string;
  name: string;
  address: string | null;
  operationalLocation: BranchOperationalLocationDto | null;
  timezone: string | null;
  isActive: boolean;
  supportsDelivery: boolean;
  deliveryDefaultCountry: string | null;
  deliveryDefaultStateRegion: string | null;
  deliveryDefaultCity: string | null;
  deliveryDefaultPostalCode: string | null;
  schedules: GetBranchDetailScheduleReadModel[];
  createdAt: string;
  updatedAt: string;
}

export type GetBranchDetailResult = Result<GetBranchDetailReadModel, GetBranchDetailError>;

@QueryHandler(GetBranchDetailQuery)
export class GetBranchDetailHandler implements IQueryHandler<GetBranchDetailQuery, GetBranchDetailResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBranchDetailQuery): Promise<GetBranchDetailResult> {
    const context = {
      useCase: 'GetBranchDetail',
      tenantId: query.tenantId,
      branchId: query.branchId,
    };
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: {
        id: query.branchId,
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        address: true,
        operationalLocationFormattedAddress: true,
        operationalLocationLatitude: true,
        operationalLocationLongitude: true,
        operationalLocationStreet: true,
        operationalLocationStreetNumber: true,
        operationalLocationCity: true,
        operationalLocationStateRegion: true,
        operationalLocationPostalCode: true,
        operationalLocationCountry: true,
        operationalLocationProviderPlaceId: true,
        timezone: true,
        isActive: true,
        supportsDelivery: true,
        deliveryDefaultCountry: true,
        deliveryDefaultStateRegion: true,
        deliveryDefaultCity: true,
        deliveryDefaultPostalCode: true,
        createdAt: true,
        updatedAt: true,
        schedules: {
          select: {
            id: true,
            type: true,
            dayOfWeek: true,
            specificDate: true,
            openTime: true,
            closeTime: true,
            slotIntervalMinutes: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ type: 'asc' }, { dayOfWeek: 'asc' }, { specificDate: 'asc' }, { openTime: 'asc' }],
        },
      },
    });

    if (!branch) {
      return err(
        getBranchDetailError(
          'tenant_management.branch_not_found',
          `Branch "${query.branchId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    return ok({
      id: branch.id,
      name: branch.name,
      address: branch.address,
      operationalLocation:
        branch.operationalLocationFormattedAddress !== null &&
        branch.operationalLocationLatitude !== null &&
        branch.operationalLocationLongitude !== null
          ? {
              formattedAddress: branch.operationalLocationFormattedAddress,
              latitude: branch.operationalLocationLatitude,
              longitude: branch.operationalLocationLongitude,
              street: branch.operationalLocationStreet,
              streetNumber: branch.operationalLocationStreetNumber,
              city: branch.operationalLocationCity,
              stateRegion: branch.operationalLocationStateRegion,
              postalCode: branch.operationalLocationPostalCode,
              country: branch.operationalLocationCountry,
              providerPlaceId: branch.operationalLocationProviderPlaceId,
            }
          : null,
      timezone: branch.timezone,
      isActive: branch.isActive,
      supportsDelivery: branch.supportsDelivery,
      deliveryDefaultCountry: branch.deliveryDefaultCountry,
      deliveryDefaultStateRegion: branch.deliveryDefaultStateRegion,
      deliveryDefaultCity: branch.deliveryDefaultCity,
      deliveryDefaultPostalCode: branch.deliveryDefaultPostalCode,
      schedules: branch.schedules.map((schedule) => ({
        id: schedule.id,
        type: schedule.type,
        dayOfWeek: schedule.dayOfWeek,
        specificDate: schedule.specificDate ? prismaDateToLocalDate(schedule.specificDate) : null,
        openTime: schedule.openTime,
        closeTime: schedule.closeTime,
        slotIntervalMinutes: schedule.slotIntervalMinutes,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
      })),
      createdAt: branch.createdAt.toISOString(),
      updatedAt: branch.updatedAt.toISOString(),
    });
  }
}
