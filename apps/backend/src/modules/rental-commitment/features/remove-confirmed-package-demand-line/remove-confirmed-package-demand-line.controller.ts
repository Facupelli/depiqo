import { Body, Controller, Delete, HttpStatus, Param, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission } from '@repo/api-contracts';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { RemoveConfirmedPackageDemandLineCommand } from './remove-confirmed-package-demand-line.command';
import {
  RemoveConfirmedPackageDemandLineError,
  RemoveConfirmedPackageDemandLineErrorCode,
} from './remove-confirmed-package-demand-line.errors';
import { RemoveConfirmedPackageDemandLineResult } from './remove-confirmed-package-demand-line.handler';
import {
  RemoveConfirmedPackageDemandLineParamsDto,
  RemoveConfirmedPackageDemandLineRequestDto,
} from './remove-confirmed-package-demand-line.request.dto';
import { RemoveConfirmedPackageDemandLineResponseDto } from './remove-confirmed-package-demand-line.response.dto';

@Controller('rental-commitments/confirmed-rentals')
export class RemoveConfirmedPackageDemandLineHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Delete(':rentalId/demand-lines/:demandLineId')
  @RequirePermission(TenantPermission.RentalsConfirmedManage)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async remove(
    @Param() params: RemoveConfirmedPackageDemandLineParamsDto,
    @Body() dto: RemoveConfirmedPackageDemandLineRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<RemoveConfirmedPackageDemandLineResponseDto> {
    const result = await this.commandBus.execute<
      RemoveConfirmedPackageDemandLineCommand,
      RemoveConfirmedPackageDemandLineResult
    >(
      new RemoveConfirmedPackageDemandLineCommand({
        tenantId: user.tenantId,
        tenantUserId: user.id,
        rentalId: params.rentalId,
        demandLineId: params.demandLineId,
        expectedVersion: dto.expectedVersion,
        quantity: dto.quantity,
        releaseAssetIds: dto.releaseAssetIds,
      }),
    );
    if (result.isErr()) throw toProblem(result.error);
    return {
      id: result.value.rentalId,
      version: result.value.version,
      updatedAt: result.value.updatedAt.toISOString(),
    };
  }
}

function toProblem(error: RemoveConfirmedPackageDemandLineError): ProblemException {
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
  'rental_commitment.rental_demand_line_not_found': problem(
    'rental_demand_line_not_found',
    'Rental demand line not found',
    HttpStatus.NOT_FOUND,
    'The requested current rental demand line could not be found.',
  ),
  'rental_commitment.rental_cannot_be_edited_from_status': problem(
    'rental_cannot_be_edited_from_status',
    'Rental cannot be edited',
    HttpStatus.CONFLICT,
    'Package demand lines can only be removed from confirmed rentals.',
  ),
  'rental_commitment.rental_period_ended': problem(
    'rental_period_ended',
    'Rental period ended',
    HttpStatus.CONFLICT,
    'A package demand line cannot be removed after the rental period has ended.',
  ),
  'rental_commitment.rental_demand_line_referenced_by_accessory': problem(
    'rental_demand_line_referenced_by_accessory',
    'Demand line is referenced by an accessory',
    HttpStatus.CONFLICT,
    'Remove or reassign accessories that reference this demand line before removing it.',
  ),
  'rental_commitment.rental_version_conflict': problem(
    'rental_version_conflict',
    'Rental was modified',
    HttpStatus.CONFLICT,
    'The rental was changed by another request. Refresh it and try again.',
  ),
  'rental_commitment.demand_line_not_part_of_package': problem(
    'demand_line_not_part_of_package',
    'Demand line is not part of a package',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The demand line does not belong to a package and cannot be removed with this operation.',
  ),
  'rental_commitment.package_must_retain_demand_line': problem(
    'package_must_retain_demand_line',
    'Package must retain equipment',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Removing this demand line would leave the package without operational equipment.',
  ),
  'rental_commitment.invalid_package_demand_line_removal_quantity': problem(
    'invalid_package_demand_line_removal_quantity',
    'Invalid removal quantity',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The requested package demand line removal quantity is invalid.',
  ),
  'rental_commitment.release_asset_count_mismatch': problem(
    'release_asset_count_mismatch',
    'Release asset count mismatch',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'The selected asset count must match the requested removal quantity.',
  ),
  'rental_commitment.duplicate_release_asset_ids': problem(
    'duplicate_release_asset_ids',
    'Duplicate release assets',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Each selected asset may only be included once.',
  ),
  'rental_commitment.release_asset_demand_line_mismatch': problem(
    'release_asset_demand_line_mismatch',
    'Selected asset does not belong to the demand line',
    HttpStatus.UNPROCESSABLE_ENTITY,
    'Every selected asset must currently belong to the package demand line being changed.',
  ),
} satisfies Record<RemoveConfirmedPackageDemandLineErrorCode, ProblemDefinition>;
