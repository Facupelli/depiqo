import { QueryBus } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import { ActorType } from '@repo/types';

import { CustomerPublicApi } from 'src/modules/customer/customer.public-api';
import { CustomerForAuthReadModel } from 'src/modules/customer/public/read-models/customer-for-auth.read-model';

import { BcryptService } from '../../bcript.service';
import { CustomerGoogleIdentityLinkedToUserError } from '../../../domain/errors/auth.errors';
import { ExternalIdentity, ExternalIdentityProvider } from '../../../domain/entities/external-identity.entity';
import { AuthHandoffTokenRepository } from '../../../infrastructure/repositories/auth-handoff-token.repository';
import { ExternalIdentityRepository } from '../../../infrastructure/repositories/external-identity.repository';
import {
  GoogleIdentityVerificationService,
  VerifiedGoogleIdentity,
} from '../../../infrastructure/services/google-identity-verification.service';
import { GoogleAuthStateService } from '../../../infrastructure/services/google-auth-state.service';
import { AuthenticateCustomerWithGoogleCommand } from './authenticate-customer-with-google.command';
import { AuthenticateCustomerWithGoogleCommandHandler } from './authenticate-customer-with-google.command-handler';

describe('AuthenticateCustomerWithGoogleCommandHandler', () => {
  const tenantA = 'tenant-a';
  const tenantB = 'tenant-b';

  const googleIdentity: VerifiedGoogleIdentity = {
    provider: 'GOOGLE',
    providerSubject: 'google-subject-1',
    email: 'customer@example.com',
    emailVerified: true,
    givenName: 'Taylor',
    familyName: 'Renter',
    pictureUrl: 'https://example.com/avatar.png',
  };

  function makeCustomer(overrides: Partial<CustomerForAuthReadModel> = {}): CustomerForAuthReadModel {
    return {
      id: 'customer-1',
      tenantId: tenantA,
      email: googleIdentity.email,
      isActive: true,
      deletedAt: null,
      ...overrides,
    };
  }

  function makeCommand(): AuthenticateCustomerWithGoogleCommand {
    return new AuthenticateCustomerWithGoogleCommand(
      'auth-code',
      'https://portal.example.com/auth/google/callback',
      'state',
      'verifier',
    );
  }

  function makeHandler(options?: {
    existingIdentity?: ExternalIdentity | null;
    customerByEmail?: CustomerForAuthReadModel | null;
    customerById?: CustomerForAuthReadModel | null;
  }) {
    const bcryptService = {
      hashPassword: jest.fn(async (value: string) => `hashed:${value}`),
    } as unknown as BcryptService;

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'GOOGLE_AUTH_HANDOFF_EXPIRATION_TIME_SECONDS') {
          return 300;
        }

        throw new Error(`Unexpected config key: ${key}`);
      }),
    } as unknown as ConfigService;

    const customerApi = {
      register: jest.fn(async () => 'customer-created'),
    } as unknown as CustomerPublicApi;

    const authHandoffTokenRepository = {
      save: jest.fn(async () => undefined),
    } as unknown as AuthHandoffTokenRepository;

    const externalIdentityRepository = {
      findCustomerByProviderSubjectInTenant: jest.fn(async () => options?.existingIdentity ?? null),
      save: jest.fn(async () => undefined),
    } as unknown as ExternalIdentityRepository;

    const googleAuthStateService = {
      verifyState: jest.fn(() => ({
        tenantId: tenantB,
        portalOrigin: 'https://portal.example.com',
        redirectPath: '/auth/google/callback',
        nonce: 'nonce-1',
      })),
    } as unknown as GoogleAuthStateService;

    const googleIdentityVerificationService = {
      verifyAuthorizationCode: jest.fn(async () => googleIdentity),
    } as unknown as GoogleIdentityVerificationService;

    const queryBus = {
      execute: jest.fn(async (query: { constructor: { name: string } }) => {
        if (query.constructor.name === 'FindCustomerForAuthByEmailQuery') {
          return options?.customerByEmail ?? null;
        }

        if (query.constructor.name === 'FindCustomerForAuthByIdQuery') {
          return options?.customerById ?? null;
        }

        throw new Error(`Unexpected query: ${query.constructor.name}`);
      }),
    } as unknown as QueryBus;

    return {
      handler: new AuthenticateCustomerWithGoogleCommandHandler(
        bcryptService,
        configService,
        customerApi,
        authHandoffTokenRepository,
        externalIdentityRepository,
        googleAuthStateService,
        googleIdentityVerificationService,
        queryBus,
      ),
      deps: {
        authHandoffTokenRepository,
        customerApi,
        externalIdentityRepository,
        queryBus,
      },
    };
  }

  it('creates a tenant-scoped customer identity when the same Google account is used in another tenant', async () => {
    const customerInTenantB = makeCustomer({ id: 'customer-2', tenantId: tenantB });
    const { handler, deps } = makeHandler({ customerByEmail: customerInTenantB });

    const result = await handler.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(deps.externalIdentityRepository.findCustomerByProviderSubjectInTenant).toHaveBeenCalledWith(
      ExternalIdentityProvider.GOOGLE,
      googleIdentity.providerSubject,
      tenantB,
    );
    expect(deps.externalIdentityRepository.save).toHaveBeenCalledTimes(1);

    const savedIdentity = (deps.externalIdentityRepository.save as jest.Mock).mock.calls[0][0] as ExternalIdentity;

    expect(savedIdentity.tenantId).toBe(tenantB);
    expect(savedIdentity.linkedActor).toEqual({ actorType: ActorType.CUSTOMER, actorId: customerInTenantB.id });
    expect(deps.customerApi.register).not.toHaveBeenCalled();
  });

  it('reuses an existing identity linked to a customer in the same tenant', async () => {
    const existingIdentity = ExternalIdentity.createForCustomer({
      tenantId: tenantB,
      provider: ExternalIdentityProvider.GOOGLE,
      providerSubject: googleIdentity.providerSubject,
      email: googleIdentity.email,
      emailVerified: googleIdentity.emailVerified,
      givenName: googleIdentity.givenName,
      familyName: googleIdentity.familyName,
      pictureUrl: googleIdentity.pictureUrl,
      customerId: 'customer-2',
    });
    const customerInTenantB = makeCustomer({ id: 'customer-2', tenantId: tenantB });
    const { handler, deps } = makeHandler({ existingIdentity, customerById: customerInTenantB });

    const result = await handler.execute(makeCommand());

    expect(result.isOk()).toBe(true);
    expect(deps.externalIdentityRepository.save).not.toHaveBeenCalled();
    expect(deps.authHandoffTokenRepository.save).toHaveBeenCalledTimes(1);
  });

  it('still rejects identities linked to a user', async () => {
    const existingIdentity = ExternalIdentity.reconstitute({
      id: 'external-identity-1',
      tenantId: tenantB,
      provider: ExternalIdentityProvider.GOOGLE,
      providerSubject: googleIdentity.providerSubject,
      email: googleIdentity.email,
      emailVerified: googleIdentity.emailVerified,
      givenName: googleIdentity.givenName,
      familyName: googleIdentity.familyName,
      pictureUrl: googleIdentity.pictureUrl,
      linkedActor: { actorType: ActorType.USER, actorId: 'user-1' },
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
      updatedAt: new Date('2026-04-21T00:00:00.000Z'),
    });
    const { handler } = makeHandler({ existingIdentity });

    const result = await handler.execute(makeCommand());

    expect(result.isErr()).toBe(true);
    expect(result._unsafeUnwrapErr()).toBeInstanceOf(CustomerGoogleIdentityLinkedToUserError);
  });
});
