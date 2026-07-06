import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { CreateCategoryApplicationError } from './create-category-application.error';
import { CreateCategoryCommand } from './create-category.command';
import { toCreateCategoryProblem } from './create-category-http-error.mapper';
import { CreateCategoryRequestDto } from './create-category.request.dto';
import { CreateCategoryResponseDto } from './create-category.response.dto';
import { CreateCategoryResult } from './create-category.handler';

@Controller('catalog/categories')
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
      Result<CreateCategoryResult, CreateCategoryApplicationError>
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
