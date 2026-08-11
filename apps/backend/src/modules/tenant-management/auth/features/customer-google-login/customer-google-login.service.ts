import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/core/database/prisma.service';
import { Env } from 'src/config/env.schema';
import { Prisma, V2RentalCustomer } from 'src/generated/prisma/client';
import { V2AuthProvider } from 'src/generated/prisma/enums';
import { AuthCustomer, normalizeEmail, toAuthCustomer } from '../../shared/auth.types';
import { CustomerGoogleHandoffTicketService } from '../../shared/handoff/customer-google-handoff-ticket.service';
import { GoogleAuthStateService } from '../../shared/google/google-auth-state.service';
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
  }): Promise<{ ticket: string; canonicalHost: string }> {
    try {
      const transaction = await this.googleAuthStateService.consumeState(input.state);
      const googleIdentity = await this.googleIdentityVerifier.verifyAuthorizationCode({
        code: input.code,
        redirectUri: this.configService.get('GOOGLE_OAUTH_REDIRECT_URI'),
        codeVerifier: input.codeVerifier,
      });

      const customer = await this.resolveOrCreateCustomer({
        tenantId: transaction.tenantId,
        googleIdentity,
      });
      const ticket = await this.handoffTicketService.issueTicket({
        tenantId: customer.tenantId,
        canonicalHost: transaction.canonicalHost,
        redirectPath: transaction.redirectPath,
        customerId: customer.id,
      });

      return {
        ticket,
        canonicalHost: transaction.canonicalHost,
      };
    } catch (error) {
      if (
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
    const existingIdentity = await this.findGoogleIdentity(tenantId, googleIdentity.providerSubject);

    if (existingIdentity) {
      return this.resolveExistingGoogleIdentity(existingIdentity.customer, googleIdentity);
    }

    const email = normalizeEmail(googleIdentity.email);
    const matchingCustomer = await this.prisma.client.v2RentalCustomer.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });

    if (matchingCustomer) {
      return this.linkExistingCustomer({ tenantId, email, customer: matchingCustomer, googleIdentity });
    }

    try {
      const customer = await this.provisionNewCustomer({ tenantId, email, googleIdentity });
      return this.recordSuccessfulGoogleLogin(customer.id, googleIdentity);
    } catch (error) {
      if (!isGoogleProvisioningUniqueConflict(error)) throw error;

      return this.reconcileNewCustomerProvisioningRace({ tenantId, email, googleIdentity });
    }
  }

  private async linkExistingCustomer(input: {
    tenantId: string;
    email: string;
    customer: V2RentalCustomer;
    googleIdentity: VerifiedGoogleIdentity;
  }): Promise<AuthCustomer> {
    const { tenantId, email, customer, googleIdentity } = input;
    if (!customer) throw new Error('A customer is required to link a Google identity.');

    this.assertCustomerIsAvailable(customer);

    try {
      await this.prisma.client.v2RentalCustomerAuthIdentity.create({
        data: this.googleIdentityCreateData({ tenantId, customerId: customer.id, email, googleIdentity }),
      });
    } catch (error) {
      if (!isGoogleIdentityUniqueConflict(error)) throw error;

      return this.reconcileExistingCustomerLinkRace({ tenantId, googleIdentity });
    }

    return this.recordSuccessfulGoogleLogin(customer.id, googleIdentity);
  }

  private async provisionNewCustomer(input: {
    tenantId: string;
    email: string;
    googleIdentity: VerifiedGoogleIdentity;
  }) {
    const { tenantId, email, googleIdentity } = input;

    return this.prisma.client.$transaction(async (tx) => {
      const customer = await tx.v2RentalCustomer.create({
        data: {
          tenantId,
          email,
          firstName: this.resolveFirstName(googleIdentity.givenName, email),
          lastName: this.resolveLastName(googleIdentity.familyName),
        },
      });

      await tx.v2RentalCustomerAuthIdentity.create({
        data: this.googleIdentityCreateData({ tenantId, customerId: customer.id, email, googleIdentity }),
      });

      return customer;
    });
  }

  private async reconcileNewCustomerProvisioningRace(input: {
    tenantId: string;
    email: string;
    googleIdentity: VerifiedGoogleIdentity;
  }): Promise<AuthCustomer> {
    const { tenantId, email, googleIdentity } = input;
    const existingIdentity = await this.findGoogleIdentity(tenantId, googleIdentity.providerSubject);
    if (existingIdentity) {
      return this.resolveExistingGoogleIdentity(existingIdentity.customer, googleIdentity);
    }

    const matchingCustomer = await this.prisma.client.v2RentalCustomer.findUnique({
      where: { tenantId_email: { tenantId, email } },
    });
    if (!matchingCustomer) {
      throw new UnauthorizedException('Customer Google identity could not be linked.');
    }

    return this.linkExistingCustomer({ tenantId, email, customer: matchingCustomer, googleIdentity });
  }

  private async reconcileExistingCustomerLinkRace(input: {
    tenantId: string;
    googleIdentity: VerifiedGoogleIdentity;
  }): Promise<AuthCustomer> {
    const identity = await this.findGoogleIdentity(input.tenantId, input.googleIdentity.providerSubject);
    if (identity) {
      return this.resolveExistingGoogleIdentity(identity.customer, input.googleIdentity);
    }

    throw new UnauthorizedException('Customer Google identity could not be linked.');
  }

  private async findGoogleIdentity(tenantId: string, providerSubject: string) {
    return this.prisma.client.v2RentalCustomerAuthIdentity.findUnique({
      where: {
        tenantId_provider_providerAccountId: {
          tenantId,
          provider: V2AuthProvider.GOOGLE,
          providerAccountId: providerSubject,
        },
      },
      include: { customer: true },
    });
  }

  private async resolveExistingGoogleIdentity(
    customer: V2RentalCustomer,
    googleIdentity: VerifiedGoogleIdentity,
  ): Promise<AuthCustomer> {
    this.assertCustomerIsAvailable(customer);
    return this.recordSuccessfulGoogleLogin(customer.id, googleIdentity);
  }

  private assertCustomerIsAvailable(customer: { isActive: boolean; deletedAt: Date | null }): void {
    if (!customer.isActive || customer.deletedAt !== null) {
      throw new UnauthorizedException('Customer is unavailable for authentication.');
    }
  }

  private googleIdentityCreateData(input: {
    tenantId: string;
    customerId: string;
    email: string;
    googleIdentity: VerifiedGoogleIdentity;
  }) {
    const { tenantId, customerId, email, googleIdentity } = input;
    return {
      tenantId,
      customerId,
      provider: V2AuthProvider.GOOGLE,
      providerAccountId: googleIdentity.providerSubject,
      email,
      emailVerified: googleIdentity.emailVerified,
      profile: this.toGoogleProfile(googleIdentity),
    };
  }

  private async recordSuccessfulGoogleLogin(
    customerId: string,
    googleIdentity: VerifiedGoogleIdentity,
  ): Promise<AuthCustomer> {
    const customer = await this.updateCustomerAfterGoogleLogin(customerId, googleIdentity);
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

type PrismaUniqueConstraintError = {
  code: 'P2002';
  meta?: {
    target?: unknown;
    driverAdapterError?: { cause?: { constraint?: { fields?: unknown } } };
  };
};

const CUSTOMER_EMAIL_UNIQUE_FIELDS = ['tenant_id', 'email'];
const GOOGLE_SUBJECT_UNIQUE_FIELDS = ['tenant_id', 'provider', 'provider_account_id'];
const CUSTOMER_GOOGLE_PROVIDER_UNIQUE_FIELDS = ['customer_id', 'provider'];

function isGoogleProvisioningUniqueConflict(error: unknown): boolean {
  return (
    isUniqueConstraintError(error, CUSTOMER_EMAIL_UNIQUE_FIELDS) ||
    isUniqueConstraintError(error, GOOGLE_SUBJECT_UNIQUE_FIELDS) ||
    isUniqueConstraintError(error, CUSTOMER_GOOGLE_PROVIDER_UNIQUE_FIELDS)
  );
}

function isGoogleIdentityUniqueConflict(error: unknown): boolean {
  return (
    isUniqueConstraintError(error, GOOGLE_SUBJECT_UNIQUE_FIELDS) ||
    isUniqueConstraintError(error, CUSTOMER_GOOGLE_PROVIDER_UNIQUE_FIELDS)
  );
}

function isUniqueConstraintError(error: unknown, expectedFields: readonly string[]): boolean {
  if (!isPrismaUniqueConstraintError(error)) return false;

  const target = error.meta?.target ?? error.meta?.driverAdapterError?.cause?.constraint?.fields;
  const fields =
    Array.isArray(target) && target.every((field): field is string => typeof field === 'string')
      ? target.map(toDatabaseFieldName)
      : [];
  return fields.length === expectedFields.length && fields.every((field) => expectedFields.includes(field));
}

function toDatabaseFieldName(field: string): string {
  return field.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function isPrismaUniqueConstraintError(error: unknown): error is PrismaUniqueConstraintError {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}
