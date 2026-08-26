import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { RetireAssetCommand } from './retire-asset.command';
import { RetireAssetError, RetireAssetErrorCode } from './retire-asset.errors';
import { RetireAssetResult } from './retire-asset.handler';
import { RetireAssetParamsDto } from './retire-asset.request.dto';

@Controller('asset-inventory/assets')
export class RetireAssetHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':assetId/retire')
  @HttpCode(HttpStatus.NO_CONTENT)
  async retire(@Param() params: RetireAssetParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<RetireAssetCommand, RetireAssetResult>(
      new RetireAssetCommand(user.tenantId, params.assetId),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

function toProblem(error: RetireAssetError): ProblemException {
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
} satisfies Record<RetireAssetErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
