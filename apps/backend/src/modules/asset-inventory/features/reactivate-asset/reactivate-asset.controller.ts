import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { ReactivateAssetCommand } from './reactivate-asset.command';
import { ReactivateAssetError, ReactivateAssetErrorCode } from './reactivate-asset.errors';
import { ReactivateAssetResult } from './reactivate-asset.handler';
import { ReactivateAssetParamsDto } from './reactivate-asset.request.dto';

@Controller('asset-inventory/assets')
export class ReactivateAssetHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':assetId/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(@Param() params: ReactivateAssetParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<ReactivateAssetCommand, ReactivateAssetResult>(
      new ReactivateAssetCommand(user.tenantId, params.assetId),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

function toProblem(error: ReactivateAssetError): ProblemException {
  const problem = problems[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const problems = {
  'asset_inventory.asset_not_found': {
    type: createProblemType('asset_inventory.asset_not_found'),
    title: 'Asset not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested asset could not be found.',
  },
  'asset_inventory.invalid_asset_lifecycle_transition': {
    type: createProblemType('asset_inventory.invalid_asset_lifecycle_transition'),
    title: 'Invalid asset lifecycle transition',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested asset lifecycle transition is not allowed.',
  },
} satisfies Record<ReactivateAssetErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
