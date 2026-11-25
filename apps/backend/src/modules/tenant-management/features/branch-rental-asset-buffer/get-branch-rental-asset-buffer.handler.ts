import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import {
  BranchRentalAssetBufferSettings,
  BranchRentalAssetBufferSettingsError,
  BranchRentalAssetBufferSettingsFact,
} from '../../public-api/branch-rental-asset-buffer-settings.public-api';
import { GetBranchRentalAssetBufferQuery } from './get-branch-rental-asset-buffer.query';

export type GetBranchRentalAssetBufferResult = Result<
  BranchRentalAssetBufferSettingsFact,
  BranchRentalAssetBufferSettingsError
>;

@QueryHandler(GetBranchRentalAssetBufferQuery)
export class GetBranchRentalAssetBufferHandler implements IQueryHandler<
  GetBranchRentalAssetBufferQuery,
  GetBranchRentalAssetBufferResult
> {
  constructor(private readonly settings: BranchRentalAssetBufferSettings) {}

  execute(query: GetBranchRentalAssetBufferQuery): Promise<GetBranchRentalAssetBufferResult> {
    return this.settings.getBranchRentalAssetBufferSettings(query);
  }
}
