import type { GetCurrentUserResponseDto } from '@repo/api-contracts';
import { Controller, Get, InternalServerErrorException, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import type { Request } from 'express';

import { AUTH_ACTOR_TYPES, AuthActor } from '../../shared/auth.types';
import { CurrentUser } from '../../shared/current-user/current-user.decorator';
import { SessionAuthGuard } from '../../shared/session/session-auth.guard';
import { WorkingBranchSessionService } from '../../shared/session/working-branch-session.service';
import { AuthorizationExempt } from '../../../authorization/tenant-authorization.decorators';
import { TenantAuthorization } from '../../../authorization/tenant-authorization.public-api';

@Controller('auth')
export class GetCurrentUserController {
  constructor(
    private readonly workingBranchSession: WorkingBranchSessionService,
    private readonly tenantAuthorization: TenantAuthorization,
  ) {}

  @Get('me')
  @UseGuards(SessionAuthGuard)
  @AuthorizationExempt()
  async me(@Req() req: Request, @CurrentUser() actor: AuthActor): Promise<GetCurrentUserResponseDto> {
    const workingBranchId = await this.workingBranchSession.resolve(req, actor.tenantId);

    if (actor.actorType === AUTH_ACTOR_TYPES.TENANT_CUSTOMER) {
      return {
        ...actor,
        emailVerifiedAt: actor.emailVerifiedAt?.toISOString() ?? null,
        workingBranchId,
      };
    }

    const authorization = await this.tenantAuthorization.getEffectivePermissions({
      tenantId: actor.tenantId,
      tenantUserId: actor.id,
    });

    if (authorization.isErr()) {
      if (authorization.error.code === 'TenantAuthorizationSubjectNotFound') {
        throw new UnauthorizedException('Authentication is no longer valid.');
      }

      throw new InternalServerErrorException('Tenant authorization could not be evaluated.');
    }

    return {
      ...actor,
      emailVerifiedAt: actor.emailVerifiedAt?.toISOString() ?? null,
      workingBranchId,
      tenantRole: {
        id: authorization.value.roleId,
        name: authorization.value.roleName,
        systemRole: authorization.value.systemRole,
      },
      permissions: [...authorization.value.permissions],
    };
  }
}
