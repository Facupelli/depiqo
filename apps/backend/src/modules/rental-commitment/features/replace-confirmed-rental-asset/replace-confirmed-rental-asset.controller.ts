import { Body, Controller, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { AssetId } from '../../domain/types/rental-commitment-ids';
import { ReplaceConfirmedRentalAssetCommand } from './replace-confirmed-rental-asset.command';
import {
  ReplaceConfirmedRentalAssetError,
  ReplaceConfirmedRentalAssetErrorCode,
} from './replace-confirmed-rental-asset.errors';
import { ReplaceConfirmedRentalAssetResult } from './replace-confirmed-rental-asset.handler';
import {
  ReplaceConfirmedRentalAssetParamsDto,
  ReplaceConfirmedRentalAssetRequestDto,
} from './replace-confirmed-rental-asset.request.dto';
import { ReplaceConfirmedRentalAssetResponseDto } from './replace-confirmed-rental-asset.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class ReplaceConfirmedRentalAssetHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post(':rentalId/assigned-assets/replace')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async replace(
    @Param() params: ReplaceConfirmedRentalAssetParamsDto,
    @Body() dto: ReplaceConfirmedRentalAssetRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReplaceConfirmedRentalAssetResponseDto> {
    const result = await this.commandBus.execute<ReplaceConfirmedRentalAssetCommand, ReplaceConfirmedRentalAssetResult>(
      new ReplaceConfirmedRentalAssetCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        expectedUpdatedAt: new Date(dto.expectedUpdatedAt),
        currentAssignedAssetId: dto.currentAssignedAssetId as AssetId,
        replacementAssetId: dto.replacementAssetId as AssetId,
      }),
    );
    if (result.isErr()) throw toProblem(result.error);

    return { id: result.value.rentalId, updatedAt: result.value.updatedAt.toISOString() };
  }
}

function toProblem(error: ReplaceConfirmedRentalAssetError): ProblemException {
  const definition = problemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({ ...definition, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

type ProblemDefinition = { type: string; title: string; status: HttpStatus; detail: string };
const problem = (slug: string, title: string, status: HttpStatus, detail: string): ProblemDefinition => ({
  type: createProblemType(`rental_commitment.${slug}`),
  title,
  status,
  detail,
});

const problemMap = {
  'rental_commitment.rental_not_found': problem(
    'rental_not_found',
    'Rental not found',
    HttpStatus.NOT_FOUND,
    'The requested rental could not be found.',
  ),
  'rental_commitment.rental_cannot_be_edited_from_status': problem(
    'rental_cannot_be_edited_from_status',
    'Rental cannot be edited',
    HttpStatus.CONFLICT,
    'Only confirmed rentals can have equipment assets replaced.',
  ),
  'rental_commitment.rental_cannot_be_edited_after_pickup': problem(
    'rental_cannot_be_edited_after_pickup',
    'Rental cannot be edited',
    HttpStatus.CONFLICT,
    'A rental cannot have equipment assets replaced at or after its pickup time.',
  ),
  'rental_commitment.rental_contract_prevents_editing': problem(
    'rental_contract_prevents_editing',
    'Rental contract prevents editing',
    HttpStatus.CONFLICT,
    'A rental with generated, signing, or signed contract terms cannot be edited.',
  ),
  'rental_commitment.rental_asset_assignment_not_found': problem(
    'rental_asset_assignment_not_found',
    'Rental asset assignment not found',
    HttpStatus.NOT_FOUND,
    'The specified currently assigned asset is not assigned to this rental.',
  ),
  'rental_commitment.replacement_asset_unavailable': problem(
    'replacement_asset_unavailable',
    'Replacement asset unavailable',
    HttpStatus.CONFLICT,
    'The replacement asset is unavailable or incompatible with this rental demand.',
  ),
  'rental_commitment.rental_version_conflict': problem(
    'rental_version_conflict',
    'Rental was modified',
    HttpStatus.CONFLICT,
    'The rental was changed by another request. Refresh it and try again.',
  ),
  'rental_commitment.invalid_rental_field': problem(
    'invalid_rental_field',
    'Invalid rental field',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The rental contains an invalid field value.',
  ),
} satisfies Record<ReplaceConfirmedRentalAssetErrorCode, ProblemDefinition>;
