import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { GetAssetsResult } from './get-assets.handler';
import { GetAssetsQuery } from './get-assets.query';
import { GetAssetsRequestDto } from './get-assets.request.dto';
import type { GetAssetsResponseDto } from './get-assets.response.dto';

@Controller('asset-inventory/assets')
export class GetAssetsHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getAssets(@Query() dto: GetAssetsRequestDto, @CurrentUser() user: AuthUser): Promise<GetAssetsResponseDto> {
    return this.queryBus.execute<GetAssetsQuery, GetAssetsResult>(
      new GetAssetsQuery(user.tenantId, { ownerId: dto.ownerId }),
    );
  }
}
