import { randomUUID, createHash } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { PrismaService } from 'src/core/database/prisma.service';
import { ActorType } from 'src/generated/prisma/enums';
import { AuthCustomer, toAuthCustomer } from '../auth.types';

export interface IssueCustomerGoogleHandoffTicketParams {
  tenantId: string;
  customerId: string;
}

@Injectable()
export class CustomerGoogleHandoffTicketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async issueTicket(params: IssueCustomerGoogleHandoffTicketParams): Promise<string> {
    const rawTicket = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.configService.get('GOOGLE_AUTH_HANDOFF_EXPIRATION_TIME_SECONDS') * 1000,
    );

    await this.prisma.client.authHandoffToken.create({
      data: {
        tokenHash: CustomerGoogleHandoffTicketService.hashToken(rawTicket),
        tenantId: params.tenantId,
        actorType: ActorType.CUSTOMER,
        actorId: params.customerId,
        expiresAt,
      },
    });

    return rawTicket;
  }

  async consumeCustomerTicket(rawTicket: string): Promise<AuthCustomer> {
    const tokenHash = CustomerGoogleHandoffTicketService.hashToken(rawTicket);
    const now = new Date();

    return this.prisma.client.$transaction(async (tx) => {
      const ticket = await tx.authHandoffToken.findUnique({
        where: { tokenHash },
      });

      if (!ticket || ticket.actorType !== ActorType.CUSTOMER) {
        throw new UnauthorizedException('Authentication handoff ticket is invalid.');
      }

      if (ticket.usedAt !== null) {
        throw new UnauthorizedException('Authentication handoff ticket has already been used.');
      }

      if (ticket.expiresAt <= now) {
        throw new UnauthorizedException('Authentication handoff ticket has expired.');
      }

      const consumeResult = await tx.authHandoffToken.updateMany({
        where: {
          id: ticket.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumeResult.count !== 1) {
        throw new UnauthorizedException('Authentication handoff ticket is invalid.');
      }

      const customer = await tx.v2RentalCustomer.findUnique({
        where: { id: ticket.actorId },
      });

      if (!customer || customer.tenantId !== ticket.tenantId || !customer.isActive || customer.deletedAt !== null) {
        throw new UnauthorizedException('Customer is unavailable for authentication.');
      }

      return toAuthCustomer(customer);
    });
  }

  private static hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
