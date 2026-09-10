import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';

import { CreateIndividualRentalCommand } from './create-individual-rental.command';
import { CreateIndividualRentalError, CreateIndividualRentalErrorCode } from './create-individual-rental.errors';
import { CreateIndividualRentalResult } from './create-individual-rental.handler';
import { CreateIndividualRentalRequestDto } from './create-individual-rental.request.dto';
import { CreateIndividualRentalResponseDto } from './create-individual-rental.response.dto';

@Controller('catalog/rentable-items')
export class CreateIndividualRentalHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() body: CreateIndividualRentalRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateIndividualRentalResponseDto> {
    const result = await this.commandBus.execute<CreateIndividualRentalCommand, CreateIndividualRentalResult>(
      new CreateIndividualRentalCommand({
        tenantId: user.tenantId,
        equipmentTypeId: body.equipmentTypeId,
        name: body.name,
        description: body.description,
        imageUrl: body.imageUrl,
        categoryId: body.categoryId,
        branchIds: body.branchIds,
      }),
    );

    if (result.isErr()) {
      throw toCreateIndividualRentalProblem(result.error);
    }

    return result.value;
  }
}

function toCreateIndividualRentalProblem(error: CreateIndividualRentalError): ProblemException {
  const problem = getProblemDescription(error.code);

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(error.code),
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

function getProblemDescription(code: CreateIndividualRentalErrorCode): {
  title: string;
  status: HttpStatus;
  detail: string;
} {
  switch (code) {
    case 'catalog.invalid_individual_rental':
      return {
        title: 'Invalid individual rental',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'The individual rental definition is invalid.',
      };
    case 'catalog.equipment_type_not_found':
      return {
        title: 'Equipment type not found',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'The selected equipment type could not be found.',
      };
    case 'catalog.branch_not_found':
      return {
        title: 'Branch not found',
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        detail: 'A selected branch could not be found.',
      };
    case 'catalog.branch_inactive':
      return {
        title: 'Branch inactive',
        status: HttpStatus.CONFLICT,
        detail: 'An inactive branch cannot receive a rental offer.',
      };
    case 'catalog.branch_deleted':
      return {
        title: 'Branch deleted',
        status: HttpStatus.CONFLICT,
        detail: 'A deleted branch cannot receive a rental offer.',
      };
    case 'catalog.branch_context_unavailable':
      return {
        title: 'Branch context unavailable',
        status: HttpStatus.SERVICE_UNAVAILABLE,
        detail: 'Branch information is temporarily unavailable.',
      };
  }

  return assertNever(code);
}

function assertNever(value: never): never {
  throw new Error(`Unhandled CreateIndividualRental error code: ${String(value)}`);
}
