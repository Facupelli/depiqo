import { Injectable } from '@nestjs/common';
import { PassportSerializer } from '@nestjs/passport';
import { AUTH_ACTOR_TYPES, AuthActor, toAuthCustomer, toAuthUser } from '../auth.types';
import { PrismaService } from 'src/core/database/prisma.service';
import { V2UserStatus } from 'src/generated/prisma/enums';
import { AuthSessionPayload } from './session.type';

@Injectable()
export class AuthSessionSerializer extends PassportSerializer {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  serializeUser(actor: AuthActor, done: (err: Error | null, payload?: AuthSessionPayload) => void): void {
    done(null, {
      actorType: actor.actorType,
      actorId: actor.id,
      sessionVersion: actor.sessionVersion,
    });
  }

  async deserializeUser(
    payload: AuthSessionPayload,
    done: (err: Error | null, actor?: AuthActor | false) => void,
  ): Promise<void> {
    try {
      if (payload.actorType === AUTH_ACTOR_TYPES.TENANT_USER) {
        return done(null, await this.deserializeTenantUser(payload));
      }

      if (payload.actorType === AUTH_ACTOR_TYPES.TENANT_CUSTOMER) {
        return done(null, await this.deserializeTenantCustomer(payload));
      }

      return done(null, false);
    } catch (error) {
      return done(error as Error);
    }
  }

  private async deserializeTenantUser(payload: AuthSessionPayload): Promise<AuthActor | false> {
    const user = await this.prisma.client.v2TenantUser.findUnique({
      where: { id: payload.actorId },
    });

    if (!user) {
      return false;
    }

    if (user.status !== V2UserStatus.ACTIVE) {
      return false;
    }

    if (user.sessionVersion !== payload.sessionVersion) {
      return false;
    }

    return toAuthUser(user);
  }

  private async deserializeTenantCustomer(payload: AuthSessionPayload): Promise<AuthActor | false> {
    const customer = await this.prisma.client.v2RentalCustomer.findUnique({
      where: { id: payload.actorId },
    });

    if (!customer) {
      return false;
    }

    if (!customer.isActive || customer.deletedAt !== null) {
      return false;
    }

    if (customer.sessionVersion !== payload.sessionVersion) {
      return false;
    }

    return toAuthCustomer(customer);
  }
}
