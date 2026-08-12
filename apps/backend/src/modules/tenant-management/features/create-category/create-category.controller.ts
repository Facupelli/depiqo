import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreateCategoryCommand } from './create-category.command';
import { CreateCategoryError, CreateCategoryErrorCode } from './create-category.errors';
import { CreateCategoryRequestDto } from './create-category.request.dto';
import { CreateCategoryResponseDto } from './create-category.response.dto';
import { CreateCategoryResult } from './create-category.handler';

@Controller('tenant-management/categories')
export class CreateCategoryHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCategory(
    @Body() dto: CreateCategoryRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateCategoryResponseDto> {
    const result = await this.commandBus.execute<
      CreateCategoryCommand,
      Result<CreateCategoryResult, CreateCategoryError>
    >(
      new CreateCategoryCommand({
        tenantId: user.tenantId,
        name: dto.name,
        slug: dto.slug,
        sortOrder: dto.sortOrder,
        isActive: dto.isActive,
      }),
    );

    if (result.isErr()) {
      throw toCreateCategoryProblem(result.error);
    }

    return result.value;
  }
}

function toCreateCategoryProblem(error: CreateCategoryError): ProblemException {
  const problem = createCategoryProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const createCategoryProblemMap = {
  'tenant_management.category_slug_already_in_use': {
    type: createProblemType('tenant_management.category_slug_already_in_use'),
    title: 'Category slug already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A category with the requested slug already exists.',
  },
} satisfies Record<CreateCategoryErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
