import { randomUUID } from 'crypto';

import { CommandHandler, ICommandHandler, QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ActorType } from '@repo/types';
import { err, ok, Result } from 'neverthrow';

import { Env } from 'src/config/env.schema';
import { CustomerPublicApi } from 'src/modules/customer/customer.public-api';
import { FindCustomerForAuthByEmailQuery } from 'src/modules/customer/public/queries/find-customer-for-auth-by-email.query';
import { FindCustomerForAuthByIdQuery } from 'src/modules/customer/public/queries/find-customer-for-auth-by-id.query';
import { CustomerForAuthReadModel } from 'src/modules/customer/public/read-models/customer-for-auth.read-model';

import { BcryptService } from '../../bcript.service';
import { AuthenticateCustomerWithGoogleCommand } from './authenticate-customer-with-google.command';
import {
  CustomerGoogleIdentityLinkedToUserError,
  CustomerUnavailableForAuthenticationError,
  InvalidGoogleAuthenticationError,
  InvalidGoogleAuthenticationStateError,
} from '../../../domain/errors/auth.errors';
import { AuthHandoffToken } from '../../../domain/entities/auth-handoff-token.entity';
import { ExternalIdentity, ExternalIdentityProvider } from '../../../domain/entities/external-identity.entity';
import { AuthHandoffTokenRepository } from '../../../infrastructure/repositories/auth-handoff-token.repository';
import { ExternalIdentityRepository } from '../../../infrastructure/repositories/external-identity.repository';
import {
  GoogleAuthorizationCodeExchangeError,
  GoogleIdentityVerificationError,
  GoogleIdentityVerificationService,
  VerifiedGoogleIdentity,
} from '../../../infrastructure/services/google-identity-verification.service';
import {
  GoogleAuthStateService,
  GoogleAuthStateVerificationError,
  VerifiedGoogleAuthState,
} from '../../../infrastructure/services/google-auth-state.service';

export type AuthenticateCustomerWithGoogleResult = Result<
  { handoffToken: string; portalOrigin: string },
  | InvalidGoogleAuthenticationError
  | InvalidGoogleAuthenticationStateError
  | CustomerGoogleIdentityLinkedToUserError
  | CustomerUnavailableForAuthenticationError
>;

@CommandHandler(AuthenticateCustomerWithGoogleCommand)
export class AuthenticateCustomerWithGoogleCommandHandler implements ICommandHandler<
  AuthenticateCustomerWithGoogleCommand,
  AuthenticateCustomerWithGoogleResult
> {
  constructor(
    private readonly bcryptService: BcryptService,
    private readonly configService: ConfigService<Env, true>,
    private readonly customerApi: CustomerPublicApi,
    private readonly authHandoffTokenRepository: AuthHandoffTokenRepository,
    private readonly externalIdentityRepository: ExternalIdentityRepository,
    private readonly googleAuthStateService: GoogleAuthStateService,
    private readonly googleIdentityVerificationService: GoogleIdentityVerificationService,
    private readonly queryBus: QueryBus,
  ) {}

  async execute(command: AuthenticateCustomerWithGoogleCommand): Promise<AuthenticateCustomerWithGoogleResult> {
    let verifiedState: VerifiedGoogleAuthState;

    try {
      verifiedState = this.googleAuthStateService.verifyState(command.state);
    } catch (error) {
      if (error instanceof GoogleAuthStateVerificationError) {
        return err(new InvalidGoogleAuthenticationStateError(error.message));
      }

      throw error;
    }

    let googleIdentity: VerifiedGoogleIdentity;

    try {
      googleIdentity = await this.googleIdentityVerificationService.verifyAuthorizationCode({
        code: command.code,
        redirectUri: command.redirectUri,
        codeVerifier: command.codeVerifier,
      });
    } catch (error) {
      if (error instanceof GoogleAuthorizationCodeExchangeError || error instanceof GoogleIdentityVerificationError) {
        return err(new InvalidGoogleAuthenticationError(error.message));
      }

      throw error;
    }

    const tenantId = verifiedState.tenantId;

    const existingIdentity = await this.externalIdentityRepository.findCustomerByProviderSubjectInTenant(
      ExternalIdentityProvider.GOOGLE,
      googleIdentity.providerSubject,
      tenantId,
    );

    const customer = existingIdentity
      ? await this.resolveExistingLinkedCustomer(existingIdentity)
      : await this.resolveOrCreateCustomer(googleIdentity, tenantId);

    if (customer.isErr()) {
      return err(customer.error);
    }

    if (!existingIdentity) {
      const externalIdentity = ExternalIdentity.createForCustomer({
        tenantId,
        provider: ExternalIdentityProvider.GOOGLE,
        providerSubject: googleIdentity.providerSubject,
        email: googleIdentity.email,
        emailVerified: googleIdentity.emailVerified,
        givenName: googleIdentity.givenName,
        familyName: googleIdentity.familyName,
        pictureUrl: googleIdentity.pictureUrl,
        customerId: customer.value.id,
      });

      await this.externalIdentityRepository.save(externalIdentity);
    }

    const rawHandoffToken = randomUUID();
    const expiresAt = new Date(
      Date.now() + this.configService.get('GOOGLE_AUTH_HANDOFF_EXPIRATION_TIME_SECONDS') * 1000,
    );
    const handoffToken = AuthHandoffToken.create({
      tokenHash: AuthHandoffTokenRepository.hashToken(rawHandoffToken),
      tenantId: customer.value.tenantId,
      actorType: ActorType.CUSTOMER,
      actorId: customer.value.id,
      expiresAt,
    });

    await this.authHandoffTokenRepository.save(handoffToken);

    return ok({ handoffToken: rawHandoffToken, portalOrigin: verifiedState.portalOrigin });
  }

  private async resolveExistingLinkedCustomer(
    identity: ExternalIdentity,
  ): Promise<
    Result<
      CustomerForAuthReadModel,
      CustomerGoogleIdentityLinkedToUserError | CustomerUnavailableForAuthenticationError
    >
  > {
    if (!identity.isLinkedToCustomer()) {
      return err(new CustomerGoogleIdentityLinkedToUserError(identity.providerSubject, identity.linkedActor.actorId));
    }

    const linkedCustomer = await this.queryBus.execute<FindCustomerForAuthByIdQuery, CustomerForAuthReadModel | null>(
      new FindCustomerForAuthByIdQuery(identity.linkedActor.actorId),
    );

    if (!linkedCustomer) {
      throw new Error(
        `Customer '${identity.linkedActor.actorId}' linked to external identity '${identity.id}' was not found.`,
      );
    }

    if (!this.customerCanAuthenticate(linkedCustomer)) {
      return err(new CustomerUnavailableForAuthenticationError(linkedCustomer.id, linkedCustomer.tenantId));
    }

    return ok(linkedCustomer);
  }

  private async resolveOrCreateCustomer(
    googleIdentity: VerifiedGoogleIdentity,
    tenantId: string,
  ): Promise<Result<CustomerForAuthReadModel, CustomerUnavailableForAuthenticationError>> {
    const matchingCustomer = await this.queryBus.execute<
      FindCustomerForAuthByEmailQuery,
      CustomerForAuthReadModel | null
    >(new FindCustomerForAuthByEmailQuery(googleIdentity.email, tenantId));

    if (matchingCustomer) {
      if (!this.customerCanAuthenticate(matchingCustomer)) {
        return err(new CustomerUnavailableForAuthenticationError(matchingCustomer.id, matchingCustomer.tenantId));
      }

      return ok(matchingCustomer);
    }

    const customerId = await this.customerApi.register({
      tenantId,
      email: googleIdentity.email,
      passwordHash: await this.generateUnusablePasswordHash(),
      firstName: this.resolveFirstName(googleIdentity.givenName, googleIdentity.email),
      lastName: this.resolveLastName(googleIdentity.familyName),
      isCompany: false,
      companyName: null,
    });

    return ok({
      id: customerId,
      tenantId,
      email: googleIdentity.email,
      isActive: true,
      deletedAt: null,
    });
  }

  private customerCanAuthenticate(customer: CustomerForAuthReadModel): boolean {
    return customer.isActive && customer.deletedAt === null;
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

  private async generateUnusablePasswordHash(): Promise<string> {
    return this.bcryptService.hashPassword(`google-only:${randomUUID()}`);
  }
}
