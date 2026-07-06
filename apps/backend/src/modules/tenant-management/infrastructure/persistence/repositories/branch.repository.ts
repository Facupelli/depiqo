import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { Branch } from '../../../domain/entities/branch.aggregate';
import { BranchMapper } from '../mappers/branch.mapper';

@Injectable()
export class BranchRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByIdForTenant(branchId: string, tenantId: string): Promise<Branch | null> {
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
      include: { schedules: true },
    });

    return branch ? BranchMapper.toDomain(branch) : null;
  }

  async save(branch: Branch): Promise<void> {
    await this.prisma.client.v2Branch.create({
      data: BranchMapper.toPersistence(branch),
    });
  }

  async update(branch: Branch): Promise<void> {
    await this.prisma.client.$transaction(async (tx) => {
      await tx.v2Branch.update({
        where: { id: branch.id },
        data: BranchMapper.toUpdateData(branch),
      });

      await tx.v2BranchSchedule.deleteMany({
        where: { branchId: branch.id },
      });

      const schedules = branch.getSchedules().map(BranchMapper.toSchedulePersistence);
      if (schedules.length > 0) {
        await tx.v2BranchSchedule.createMany({
          data: schedules,
        });
      }
    });
  }
}
