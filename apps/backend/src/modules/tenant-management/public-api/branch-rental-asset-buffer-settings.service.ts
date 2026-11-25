import { Injectable } from '@nestjs/common';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  BranchRentalAssetBufferSettings,
  BranchRentalAssetBufferSettingsError,
  BranchRentalAssetBufferSettingsFact,
  GetBranchRentalAssetBufferSettingsInput,
} from './branch-rental-asset-buffer-settings.public-api';

@Injectable()
export class BranchRentalAssetBufferSettingsService extends BranchRentalAssetBufferSettings {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getBranchRentalAssetBufferSettings({
    tenantId,
    branchId,
  }: GetBranchRentalAssetBufferSettingsInput): Promise<
    Result<BranchRentalAssetBufferSettingsFact, BranchRentalAssetBufferSettingsError>
  > {
    const branch = await this.prisma.client.v2Branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null, tenant: { status: 'ACTIVE', deletedAt: null } },
      select: { rentalAssetBeforeBufferMinutes: true, rentalAssetAfterBufferMinutes: true },
    });

    if (!branch) return err({ code: 'BranchNotFound', message: `Branch "${branchId}" was not found.` });

    return ok({
      beforeBufferMinutes: branch.rentalAssetBeforeBufferMinutes,
      afterBufferMinutes: branch.rentalAssetAfterBufferMinutes,
    });
  }
}
