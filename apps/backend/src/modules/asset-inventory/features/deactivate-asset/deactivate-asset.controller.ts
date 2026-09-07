import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { DeactivateAssetCommand } from './deactivate-asset.command';
import { DeactivateAssetError, DeactivateAssetErrorCode } from './deactivate-asset.errors';
import { DeactivateAssetResult } from './deactivate-asset.handler';
import { DeactivateAssetParamsDto } from './deactivate-asset.request.dto';

@Controller('asset-inventory/assets')
export class DeactivateAssetHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':assetId/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param() params: DeactivateAssetParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<DeactivateAssetCommand, DeactivateAssetResult>(
      new DeactivateAssetCommand(user.tenantId, params.assetId),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

function toProblem(error: DeactivateAssetError): ProblemException {
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
} satisfies Record<DeactivateAssetErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
