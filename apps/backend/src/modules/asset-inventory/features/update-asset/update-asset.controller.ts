import { Body, Controller, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { UpdateAssetCommand } from './update-asset.command';
import { UpdateAssetError, UpdateAssetErrorCode } from './update-asset.errors';
import { UpdateAssetResult } from './update-asset.handler';
import { UpdateAssetParamsDto, UpdateAssetRequestDto } from './update-asset.request.dto';

@Controller('asset-inventory/assets')
export class UpdateAssetHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Patch(':assetId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async update(
    @Param() params: UpdateAssetParamsDto,
    @Body() dto: UpdateAssetRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<UpdateAssetCommand, UpdateAssetResult>(
      new UpdateAssetCommand(user.tenantId, params.assetId, dto.serialNumber, dto.notes),
    );
    if (result.isErr()) throw toProblem(result.error);
  }
}

function toProblem(error: UpdateAssetError): ProblemException {
  const problem = problems[error.code];
  const extensions =
    error.code === 'asset_inventory.duplicate_asset_serial_number'
      ? { code: error.code, serialNumber: error.context?.serialNumber }
      : { code: error.code };
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions }),
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
  'asset_inventory.duplicate_asset_serial_number': {
    type: createProblemType('asset_inventory.duplicate_asset_serial_number'),
    title: 'Duplicate asset serial number',
    status: HttpStatus.CONFLICT,
    detail: 'An active asset with this serial number already exists.',
  },
} satisfies Record<UpdateAssetErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
