import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AUTH_ACTOR_TYPES } from 'src/modules/tenant-management/auth/shared/auth.types';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { mapResolvePublicSigningSessionHttpError } from './resolve-public-signing-session-http.mapper';
import { ResolvePublicSigningSessionQuery as ResolvePublicSigningSessionCqrsQuery } from './resolve-public-signing-session.query';
import { ResolvePublicSigningSessionQueryDto } from './resolve-public-signing-session.request.dto';
import { ResolvePublicSigningSessionResponseDto } from './resolve-public-signing-session.response.dto';
import { ResolvePublicSigningSessionResult } from './resolve-public-signing-session.result';
import { ResolvePublicSigningSessionQueryError } from './resolve-public-signing-session.service';

@Controller('document-signing/public/sessions')
export class ResolvePublicSigningSessionHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('resolve')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async resolve(@Query() query: ResolvePublicSigningSessionQueryDto): Promise<ResolvePublicSigningSessionResponseDto> {
    const result = await this.queryBus.execute<
      ResolvePublicSigningSessionCqrsQuery,
      Result<ResolvePublicSigningSessionResult, ResolvePublicSigningSessionQueryError>
    >(new ResolvePublicSigningSessionCqrsQuery(query.token));

    if (result.isErr()) {
      throw mapResolvePublicSigningSessionHttpError(result.error);
    }

    return result.value;
  }
}
