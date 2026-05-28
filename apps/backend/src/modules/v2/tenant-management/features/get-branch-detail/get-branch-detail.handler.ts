import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  tenantManagementApplicationError,
  TenantManagementApplicationError,
} from '../tenant-management-application.error';
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

export type GetBranchDetailResult = Result<GetBranchDetailReadModel, TenantManagementApplicationError>;

@QueryHandler(GetBranchDetailQuery)
export class GetBranchDetailHandler implements IQueryHandler<GetBranchDetailQuery, GetBranchDetailResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBranchDetailQuery): Promise<GetBranchDetailResult> {
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
      return err(tenantManagementApplicationError('BranchNotFound', `Branch "${query.branchId}" was not found.`));
    }

    return ok({
      id: branch.id,
      name: branch.name,
      address: branch.address,
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
        specificDate: schedule.specificDate ? schedule.specificDate.toISOString().slice(0, 10) : null,
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
