import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AUTH_ACTOR_TYPES } from 'src/modules/tenant-management/auth/shared/auth.types';
import { AllowAuthActors } from 'src/modules/tenant-management/auth/shared/session/auth-actor-access.decorator';
import { SessionAuthGuard } from 'src/modules/tenant-management/auth/shared/session/session-auth.guard';
import { TenantCustomerSessionGuard } from 'src/modules/tenant-management/auth/shared/session/tenant-customer-session.guard';

import { extractBearerToken } from '../../application/signing-bearer-token';
import { GetPublicSigningSessionResult } from './get-public-signing-session.result';
import { mapGetPublicSigningSessionHttpError } from './get-public-signing-session-http.mapper';
import { GetPublicSigningSessionQuery } from './get-public-signing-session.query';
import { GetPublicSigningSessionResponseDto } from './get-public-signing-session.response.dto';
import { GetPublicSigningSessionQueryError } from './get-public-signing-session.service';

@Controller('document-signing/public/sessions')
export class GetPublicSigningSessionHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get('me')
  @AllowAuthActors(AUTH_ACTOR_TYPES.TENANT_CUSTOMER)
  @UseGuards(SessionAuthGuard, TenantCustomerSessionGuard)
  async getSession(
    @Headers('authorization') authorizationHeader: string | undefined,
  ): Promise<GetPublicSigningSessionResponseDto> {
    const result = await this.queryBus.execute<
      GetPublicSigningSessionQuery,
      Result<GetPublicSigningSessionResult, GetPublicSigningSessionQueryError>
    >(new GetPublicSigningSessionQuery(extractBearerToken(authorizationHeader)));

    if (result.isErr()) {
      throw mapGetPublicSigningSessionHttpError(result.error);
    }

    return {
      ...result.value,
      expiresAt: result.value.expiresAt?.toISOString() ?? null,
      signedAt: result.value.signedAt?.toISOString() ?? null,
    };
  }
}
