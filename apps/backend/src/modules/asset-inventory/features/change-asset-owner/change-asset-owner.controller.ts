import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { ChangeAssetOwnerCommand } from './change-asset-owner.command';
import { ChangeAssetOwnerError, ChangeAssetOwnerErrorCode } from './change-asset-owner.errors';
import { ChangeAssetOwnerResult } from './change-asset-owner.handler';
import { ChangeAssetOwnerParamsDto, ChangeAssetOwnerRequestDto } from './change-asset-owner.request.dto';

@Controller('asset-inventory/assets')
export class ChangeAssetOwnerHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':assetId/owner')
  @HttpCode(HttpStatus.NO_CONTENT)
  async changeOwner(
    @Param() params: ChangeAssetOwnerParamsDto,
    @Body() dto: ChangeAssetOwnerRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<ChangeAssetOwnerCommand, ChangeAssetOwnerResult>(
      new ChangeAssetOwnerCommand(user.tenantId, params.assetId, dto.ownerId),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

function toProblem(error: ChangeAssetOwnerError): ProblemException {
  const problem = problems[error.code];
  const context = error.context ?? {};
  const ownerIdCodes: ChangeAssetOwnerErrorCode[] = [
    'asset_inventory.asset_owner_not_found',
    'asset_inventory.active_owner_contract_not_found',
    'asset_inventory.multiple_active_owner_contracts',
  ];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: {
        code: error.code,
        ...(ownerIdCodes.includes(error.code) ? { ownerId: context.ownerId } : {}),
        ...(error.code === 'asset_inventory.invalid_asset_field'
          ? { 'invalid-params': [{ name: context.field, reason: context.reason }] }
          : {}),
      },
    }),
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
  'asset_inventory.invalid_asset_field': {
    type: createProblemType('asset_inventory.invalid_asset_field'),
    title: 'Invalid asset field',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested ownership state is invalid.',
  },
  'asset_inventory.asset_owner_not_found': {
    type: createProblemType('asset_inventory.asset_owner_not_found'),
    title: 'Asset owner not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested asset owner could not be found.',
  },
  'asset_inventory.active_owner_contract_not_found': {
    type: createProblemType('asset_inventory.active_owner_contract_not_found'),
    title: 'Active owner contract not found',
    status: HttpStatus.CONFLICT,
    detail: 'The requested asset owner does not have an active contract.',
  },
  'asset_inventory.multiple_active_owner_contracts': {
    type: createProblemType('asset_inventory.multiple_active_owner_contracts'),
    title: 'Multiple active owner contracts',
    status: HttpStatus.CONFLICT,
    detail: 'The requested asset owner has multiple active contracts.',
  },
} satisfies Record<ChangeAssetOwnerErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
