import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CreatePackageCommand } from './create-package.command';
import { CreatePackageError, CreatePackageErrorCode } from './create-package.errors';
import { CreatePackageServiceResult } from './create-package.handler';
import { CreatePackageRequestDto } from './create-package.request.dto';
import { CreatePackageResponseDto } from './create-package.response.dto';

@Controller('offering-setup/packages')
export class CreatePackageHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreatePackageRequestDto, @CurrentUser() user: AuthUser): Promise<CreatePackageResponseDto> {
    const result = await this.commandBus.execute<CreatePackageCommand, CreatePackageServiceResult>(
      new CreatePackageCommand({
        tenantId: user.tenantId,
        name: dto.name,
        description: dto.description,
        imageUrl: dto.imageUrl,
        categoryId: dto.categoryId,
        branchIds: dto.branchIds,
        requirements: dto.requirements,
      }),
    );
    if (result.isErr()) throw toCreatePackageProblem(result.error);
    return result.value;
  }
}

function toCreatePackageProblem(error: CreatePackageError): ProblemException {
  const problem = createpackageProblemMap[error.code];
  return ProblemException.from({
    problemDetails: createProblemDetails({
      ...problem,
      extensions: { code: error.code, ...error.context },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createpackageProblemMap = {
  'offering_setup.tenant_unavailable': {
    type: createProblemType('offering_setup.tenant_unavailable'),
    title: 'Tenant unavailable',
    status: HttpStatus.NOT_FOUND,
    detail: 'The tenant is not available.',
  },
  'offering_setup.branch_unavailable': {
    type: createProblemType('offering_setup.branch_unavailable'),
    title: 'Branch unavailable',
    status: HttpStatus.NOT_FOUND,
    detail: 'One or more selected branches are not available.',
  },
  'offering_setup.equipment_type_not_found': {
    type: createProblemType('offering_setup.equipment_type_not_found'),
    title: 'Equipment type not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'A required equipment type was not found.',
  },
  'offering_setup.equipment_type_inactive': {
    type: createProblemType('offering_setup.equipment_type_inactive'),
    title: 'Equipment type inactive',
    status: HttpStatus.CONFLICT,
    detail: 'A required equipment type is inactive.',
  },
  'offering_setup.insufficient_active_equipment_stock': {
    type: createProblemType('offering_setup.insufficient_active_equipment_stock'),
    title: 'Insufficient equipment stock',
    status: HttpStatus.CONFLICT,
    detail: 'A selected branch does not have enough active equipment for this package.',
  },
  'offering_setup.invalid_package': {
    type: createProblemType('offering_setup.invalid_package'),
    title: 'Invalid package',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The package configuration is invalid.',
  },
} satisfies Record<CreatePackageErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
