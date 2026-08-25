import { Controller, Get, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import {
  GetReplacementAssetCandidatesError,
  GetReplacementAssetCandidatesErrorCode,
} from './get-replacement-asset-candidates.errors';
import { GetReplacementAssetCandidatesResult } from './get-replacement-asset-candidates.handler';
import { GetReplacementAssetCandidatesQuery } from './get-replacement-asset-candidates.query';
import { GetReplacementAssetCandidatesParamsDto } from './get-replacement-asset-candidates.request.dto';
import { GetReplacementAssetCandidatesResponseDto } from './get-replacement-asset-candidates.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class GetReplacementAssetCandidatesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/assigned-assets/:currentAssignedAssetId/replacement-candidates')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async getCandidates(
    @Param() params: GetReplacementAssetCandidatesParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetReplacementAssetCandidatesResponseDto> {
    const result = await this.queryBus.execute<GetReplacementAssetCandidatesQuery, GetReplacementAssetCandidatesResult>(
      new GetReplacementAssetCandidatesQuery(user.tenantId, params.rentalId, params.currentAssignedAssetId),
    );
    if (result.isErr()) throw toProblem(result.error);

    return result.value;
  }
}

function toProblem(error: GetReplacementAssetCandidatesError): ProblemException {
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
  'rental_commitment.rental_period_ended': problem(
    'rental_period_ended',
    'Rental period ended',
    HttpStatus.CONFLICT,
    'Replacement candidates are unavailable after the rental period has ended.',
  ),
  'rental_commitment.rental_asset_assignment_not_found': problem(
    'rental_asset_assignment_not_found',
    'Rental asset assignment not found',
    HttpStatus.NOT_FOUND,
    'The specified currently assigned asset is not assigned to this rental.',
  ),
  'rental_commitment.invalid_rental_field': problem(
    'invalid_rental_field',
    'Invalid rental field',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The rental contains an invalid field value.',
  ),
} satisfies Record<GetReplacementAssetCandidatesErrorCode, ProblemDefinition>;
