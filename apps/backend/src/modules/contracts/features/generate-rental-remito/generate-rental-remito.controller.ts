import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import type { Response } from 'express';

import { AUTH_ACTOR_TYPES, AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { CurrentUser } from 'src/modules/tenant-management/auth/shared/current-user/current-user.decorator';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantUserSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-user-session.guard';

import { GenerateRentalRemitoResult } from './generate-rental-remito.handler';
import { GenerateRentalRemitoQuery } from './generate-rental-remito.query';
import { toGenerateRentalRemitoProblem } from './generate-rental-remito-http-error.mapper';

@Controller('contracts/rentals')
export class GenerateRentalRemitoHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':rentalId/remito')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async previewRemito(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    await this.sendRemitoResponse({
      tenantId: user.tenantId,
      rentalId,
      response,
      disposition: 'inline',
    });
  }

  @Get(':rentalId/remito/download')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_USER)
  @UseGuards(SessionAuthGuard, TenantUserSessionGuard)
  async downloadRemito(
    @Param('rentalId') rentalId: string,
    @CurrentUser() user: AuthUser,
    @Res() response: Response,
  ): Promise<void> {
    await this.sendRemitoResponse({
      tenantId: user.tenantId,
      rentalId,
      response,
      disposition: 'attachment',
    });
  }

  private async sendRemitoResponse({
    tenantId,
    rentalId,
    response,
    disposition,
  }: {
    tenantId: string;
    rentalId: string;
    response: Response;
    disposition: 'inline' | 'attachment';
  }): Promise<void> {
    const result = await this.queryBus.execute<GenerateRentalRemitoQuery, GenerateRentalRemitoResult>(
      new GenerateRentalRemitoQuery(tenantId, rentalId),
    );

    if (result.isErr()) {
      throw toGenerateRentalRemitoProblem(result.error);
    }

    response.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${result.value.fileName}"`,
      'Content-Length': result.value.buffer.length,
    });

    response.end(result.value.buffer);
  }
}
