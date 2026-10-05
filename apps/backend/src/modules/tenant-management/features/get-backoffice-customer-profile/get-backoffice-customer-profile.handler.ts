import type { GetBackofficeCustomerProfileResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { resolveCustomerDisplayIdentity } from '../../customer/customer-display-identity';
import { isCustomerIdentityDocumentReference } from '../../customer/customer-identity-document-reference';
import {
  getBackofficeCustomerProfileError,
  GetBackofficeCustomerProfileError,
} from './get-backoffice-customer-profile.errors';
import { GetBackofficeCustomerProfileQuery } from './get-backoffice-customer-profile.query';

export type GetBackofficeCustomerProfileResult = Result<
  GetBackofficeCustomerProfileResponseDto,
  GetBackofficeCustomerProfileError
>;

@QueryHandler(GetBackofficeCustomerProfileQuery)
export class GetBackofficeCustomerProfileHandler implements IQueryHandler<
  GetBackofficeCustomerProfileQuery,
  GetBackofficeCustomerProfileResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetBackofficeCustomerProfileQuery): Promise<GetBackofficeCustomerProfileResult> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: { id: query.customerId, tenantId: query.tenantId, deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isCompany: true,
        companyName: true,
        email: true,
        phone: true,
        passwordHash: true,
        emailVerifiedAt: true,
        lastLoginAt: true,
        isActive: true,
        onboardingStatus: true,
        createdAt: true,
        lastSubmittedAt: true,
        authIdentities: { where: { provider: 'GOOGLE' }, select: { provider: true }, take: 1 },
        profile: {
          select: {
            fullName: true,
            phone: true,
            businessName: true,
            identityDocumentPath: true,
            occupation: true,
            company: true,
            instagram: true,
            knowsExistingCustomer: true,
            city: true,
            stateRegion: true,
            country: true,
            reviewedAt: true,
            reviewedById: true,
          },
        },
      },
    });

    if (!customer) return err(getBackofficeCustomerProfileError(query.customerId, query.tenantId));

    const reviewer = customer.profile?.reviewedById
      ? await this.prisma.client.v2TenantUser.findFirst({
          where: { id: customer.profile.reviewedById, tenantId: query.tenantId },
          select: { name: true, email: true },
        })
      : null;

    return ok({
      id: customer.id,
      ...resolveCustomerDisplayIdentity(customer),
      isCompany: customer.isCompany,
      email: customer.email,
      phone: customer.profile?.phone ?? customer.phone,
      isActive: customer.isActive,
      onboardingStatus: customer.onboardingStatus,
      emailVerified: customer.emailVerifiedAt !== null,
      createdAt: customer.createdAt.toISOString(),
      lastSubmittedAt: customer.lastSubmittedAt?.toISOString() ?? null,
      lastLoginAt: customer.lastLoginAt?.toISOString() ?? null,
      authenticationMethods: [
        ...(customer.passwordHash ? (['PASSWORD'] as const) : []),
        ...(customer.authIdentities.length > 0 ? (['GOOGLE'] as const) : []),
      ],
      identityDocumentOnFile: customer.profile
        ? isCustomerIdentityDocumentReference(customer.profile.identityDocumentPath, customer.id)
        : false,
      submittedProfile: customer.profile
        ? {
            occupation: customer.profile.occupation,
            employer: customer.profile.company,
            instagram: customer.profile.instagram,
            knowsExistingCustomer: customer.profile.knowsExistingCustomer,
            city: customer.profile.city,
            stateRegion: customer.profile.stateRegion,
            country: customer.profile.country,
            reviewedAt: customer.profile.reviewedAt?.toISOString() ?? null,
            reviewerLabel: customer.profile.reviewedById
              ? reviewer?.name?.trim() || reviewer?.email || 'Revisor no disponible'
              : null,
          }
        : null,
    });
  }
}
