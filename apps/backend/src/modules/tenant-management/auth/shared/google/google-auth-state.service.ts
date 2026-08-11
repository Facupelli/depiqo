import { createHash, randomUUID } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Env } from 'src/config/env.schema';
import { PrismaService } from 'src/core/database/prisma.service';

export interface IssueGoogleAuthStateParams {
  tenantId: string;
  canonicalHost: string;
  redirectPath: string;
}

export interface ConsumedGoogleAuthState {
  tenantId: string;
  canonicalHost: string;
  redirectPath: string;
}

@Injectable()
export class GoogleAuthStateService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
  ) {}

  async issueState(params: IssueGoogleAuthStateParams): Promise<string> {
    const state = randomUUID();
    const expiresAt = new Date(Date.now() + this.configService.get('GOOGLE_AUTH_STATE_EXPIRATION_TIME_SECONDS') * 1000);

    await this.prisma.client.customerGoogleOAuthTransaction.create({
      data: {
        stateHash: GoogleAuthStateService.hashState(state),
        tenantId: params.tenantId,
        canonicalHost: params.canonicalHost,
        redirectPath: params.redirectPath,
        expiresAt,
      },
    });

    return state;
  }

  async consumeState(state: string): Promise<ConsumedGoogleAuthState> {
    const stateHash = GoogleAuthStateService.hashState(state);
    const now = new Date();

    return this.prisma.client.$transaction(async (tx) => {
      const transaction = await tx.customerGoogleOAuthTransaction.findUnique({
        where: { stateHash },
      });

      if (!transaction || transaction.usedAt !== null || transaction.expiresAt <= now) {
        throw new UnauthorizedException('Google authentication state is invalid or expired.');
      }

      const consumed = await tx.customerGoogleOAuthTransaction.updateMany({
        where: {
          id: transaction.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      });

      if (consumed.count !== 1) {
        throw new UnauthorizedException('Google authentication state is invalid or expired.');
      }

      return {
        tenantId: transaction.tenantId,
        canonicalHost: transaction.canonicalHost,
        redirectPath: transaction.redirectPath,
      };
    });
  }

  private static hashState(state: string): string {
    return createHash('sha256').update(state).digest('hex');
  }
}
