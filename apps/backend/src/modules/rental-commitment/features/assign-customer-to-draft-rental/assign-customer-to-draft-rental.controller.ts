import { Body, Controller, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { AssignCustomerToDraftRentalCommand } from './assign-customer-to-draft-rental.command';
import {
  AssignCustomerToDraftRentalError,
  AssignCustomerToDraftRentalErrorCode,
} from './assign-customer-to-draft-rental.errors';
import { AssignCustomerToDraftRentalResult } from './assign-customer-to-draft-rental.handler';
import {
  AssignCustomerToDraftRentalParamsDto,
  AssignCustomerToDraftRentalRequestDto,
} from './assign-customer-to-draft-rental.request.dto';

@Controller('rental-commitments/rentals')
export class AssignCustomerToDraftRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put(':rentalId/customer')
  @HttpCode(HttpStatus.NO_CONTENT)
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async assignCustomer(
    @Param() params: AssignCustomerToDraftRentalParamsDto,
    @Body() dto: AssignCustomerToDraftRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    const result = await this.commandBus.execute<AssignCustomerToDraftRentalCommand, AssignCustomerToDraftRentalResult>(
      new AssignCustomerToDraftRentalCommand({
        tenantId: user.tenantId,
        rentalId: params.rentalId,
        customerId: dto.customerId,
      }),
    );

    if (result.isErr()) {
      throw toAssignCustomerToDraftRentalProblem(result.error);
    }
  }
}

function toAssignCustomerToDraftRentalProblem(error: AssignCustomerToDraftRentalError): ProblemException {
  const problem = assignCustomerToDraftRentalProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({ ...problem, extensions: { code: error.code } }),
    applicationError: error,
    cause: error.cause,
  });
}

const assignCustomerToDraftRentalProblemMap = {
  'rental_commitment.rental_not_found': {
    type: createProblemType('rental_commitment.rental_not_found'),
    title: 'Rental not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested rental could not be found.',
  },
  'rental_commitment.rental_version_conflict': {
    type: createProblemType('rental_commitment.rental_version_conflict'),
    title: 'Rental was modified',
    status: HttpStatus.CONFLICT,
    detail: 'The rental was changed by another request. Refresh it and try again.',
  },
  'rental_commitment.rental_must_be_draft': {
    type: createProblemType('rental_commitment.rental_must_be_draft'),
    title: 'Rental must be draft',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested rental must be a draft rental.',
  },
  'rental_commitment.customer_not_found_or_outside_tenant': {
    type: createProblemType('rental_commitment.customer_not_found_or_outside_tenant'),
    title: 'Customer cannot be assigned to draft rental',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is not available for this draft rental.',
  },
  'rental_commitment.customer_deleted': {
    type: createProblemType('rental_commitment.customer_deleted'),
    title: 'Customer is deleted',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is no longer available.',
  },
  'rental_commitment.customer_inactive': {
    type: createProblemType('rental_commitment.customer_inactive'),
    title: 'Customer is inactive',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is inactive.',
  },
  'rental_commitment.invalid_customer': {
    type: createProblemType('rental_commitment.invalid_customer'),
    title: 'Invalid customer',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The requested customer is invalid.',
  },
} satisfies Record<
  AssignCustomerToDraftRentalErrorCode,
  { type: string; title: string; status: HttpStatus; detail: string }
>;
