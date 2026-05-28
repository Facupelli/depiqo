import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { AuthUser } from '../../../tenant-management/auth/shared/auth.types';
import { CurrentUser } from '../../../tenant-management/auth/shared/current-user/current-user.decorator';
import { GetCategoriesResult } from './get-categories.handler';
import { GetCategoriesQuery } from './get-categories.query';
import type { GetCategoriesResponseDto } from './get-categories.response.dto';

@Controller('v2/catalog/categories')
export class GetCategoriesHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getCategories(@CurrentUser() user: AuthUser): Promise<GetCategoriesResponseDto> {
    return this.queryBus.execute<GetCategoriesQuery, GetCategoriesResult>(new GetCategoriesQuery(user.tenantId));
  }
}
