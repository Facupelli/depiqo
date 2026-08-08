import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/core/database/prisma.service';
import { Env } from 'src/config/env.schema';
import { Prisma } from 'src/generated/prisma/client';
import { V2AuthProvider } from 'src/generated/prisma/enums';
import { AuthCustomer, normalizeEmail, toAuthCustomer } from '../../shared/auth.types';
import { CustomerGoogleHandoffTicketService } from '../../shared/handoff/customer-google-handoff-ticket.service';
import {
  GoogleAuthStateService,
  GoogleAuthStateVerificationError,
} from '../../shared/google/google-auth-state.service';
import {
  GoogleAuthorizationCodeExchangeError,
  GoogleIdentityVerificationError,
} from '../../shared/google/google-identity-verification.service';
import { GoogleIdentityVerifier, VerifiedGoogleIdentity } from '../../shared/google/google-identity-verifier.port';

@Injectable()
export class CustomerGoogleLoginService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<Env, true>,
    private readonly googleAuthStateService: GoogleAuthStateService,
    private readonly googleIdentityVerifier: GoogleIdentityVerifier,
    private readonly handoffTicketService: CustomerGoogleHandoffTicketService,
  ) {}

  async createHandoff(input: {
    code: string;
    state: string;
    codeVerifier?: string;
  }): Promise<{ ticket: string; portalOrigin: string; redirectPath: string }> {
    try {
      const verifiedState = this.googleAuthStateService.verifyState(input.state);
      const googleIdentity = await this.googleIdentityVerifier.verifyAuthorizationCode({
        code: input.code,
        redirectUri: this.configService.get('GOOGLE_OAUTH_REDIRECT_URI'),
        codeVerifier: input.codeVerifier,
      });

      const customer = await this.resolveOrCreateCustomer({
        tenantId: verifiedState.tenantId,
        googleIdentity,
      });
      const ticket = await this.handoffTicketService.issueTicket({
        tenantId: customer.tenantId,
        customerId: customer.id,
      });

      return {
        ticket,
        portalOrigin: verifiedState.portalOrigin,
        redirectPath: verifiedState.redirectPath,
      };
    } catch (error) {
      if (
        error instanceof GoogleAuthStateVerificationError ||
        error instanceof GoogleAuthorizationCodeExchangeError ||
        error instanceof GoogleIdentityVerificationError
      ) {
        throw new UnauthorizedException(error.message);
      }

      throw error;
    }
  }

  private async resolveOrCreateCustomer(input: {
    tenantId: string;
    googleIdentity: VerifiedGoogleIdentity;
  }): Promise<AuthCustomer> {
    const { tenantId, googleIdentity } = input;

    const existingIdentity = await this.prisma.client.v2RentalCustomerAuthIdentity.findUnique({
      where: {
        tenantId_provider_providerAccountId: {
          tenantId,
          provider: V2AuthProvider.GOOGLE,
          providerAccountId: googleIdentity.providerSubject,
        },
      },
      include: {
        customer: true,
      },
    });

    if (existingIdentity) {
      const customer = existingIdentity.customer;

      if (!customer.isActive || customer.deletedAt !== null) {
        throw new UnauthorizedException('Customer is unavailable for authentication.');
      }

      const updatedCustomer = await this.updateCustomerAfterGoogleLogin(customer.id, googleIdentity);
      return toAuthCustomer(updatedCustomer);
    }

    const email = normalizeEmail(googleIdentity.email);
    const matchingCustomer = await this.prisma.client.v2RentalCustomer.findUnique({
      where: {
        tenantId_email: {
          tenantId,
          email,
        },
      },
    });

    if (matchingCustomer && (!matchingCustomer.isActive || matchingCustomer.deletedAt !== null)) {
      throw new UnauthorizedException('Customer is unavailable for authentication.');
    }

    const customer = matchingCustomer
      ? await this.updateCustomerAfterGoogleLogin(matchingCustomer.id, googleIdentity)
      : await this.prisma.client.v2RentalCustomer.create({
          data: {
            tenantId,
            email,
            firstName: this.resolveFirstName(googleIdentity.givenName, email),
            lastName: this.resolveLastName(googleIdentity.familyName),
            emailVerifiedAt: new Date(),
            avatarUrl: googleIdentity.pictureUrl,
            lastLoginAt: new Date(),
          },
        });

    await this.prisma.client.v2RentalCustomerAuthIdentity.create({
      data: {
        tenantId,
        customerId: customer.id,
        provider: V2AuthProvider.GOOGLE,
        providerAccountId: googleIdentity.providerSubject,
        email,
        emailVerified: googleIdentity.emailVerified,
        profile: this.toGoogleProfile(googleIdentity),
      },
    });

    return toAuthCustomer(customer);
  }

  private async updateCustomerAfterGoogleLogin(customerId: string, googleIdentity: VerifiedGoogleIdentity) {
    return this.prisma.client.v2RentalCustomer.update({
      where: { id: customerId },
      data: {
        emailVerifiedAt: googleIdentity.emailVerified ? new Date() : undefined,
        avatarUrl: googleIdentity.pictureUrl ?? undefined,
        lastLoginAt: new Date(),
      },
    });
  }

  private toGoogleProfile(googleIdentity: VerifiedGoogleIdentity): Prisma.InputJsonObject {
    return {
      providerSubject: googleIdentity.providerSubject,
      email: googleIdentity.email,
      emailVerified: googleIdentity.emailVerified,
      givenName: googleIdentity.givenName,
      familyName: googleIdentity.familyName,
      pictureUrl: googleIdentity.pictureUrl,
    };
  }

  private resolveFirstName(givenName: string | null, email: string): string {
    if (givenName && givenName.trim().length > 0) {
      return givenName.trim();
    }

    const localPart = email.split('@')[0]?.trim();
    return localPart && localPart.length > 0 ? localPart : 'Google';
  }

  private resolveLastName(familyName: string | null): string {
    if (familyName && familyName.trim().length > 0) {
      return familyName.trim();
    }

    return 'User';
  }
}
