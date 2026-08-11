import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { prismaDateToLocalDate } from 'src/core/temporal/local-date';

import { GetCustomerProfileDetailError, getCustomerProfileDetailError } from './get-customer-profile-detail.errors';
import { GetCustomerProfileDetailQuery } from './get-customer-profile-detail.query';

export type GetCustomerProfileDetailResult = Result<
  {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    isCompany: boolean;
    companyName: string | null;
    isActive: boolean;
    onboardingStatus: 'NOT_STARTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
    createdAt: string;
    updatedAt: string;
    profile: {
      id: string;
      fullName: string;
      phone: string;
      birthDate: string;
      documentNumber: string;
      identityDocumentPath: string;
      address: string;
      city: string;
      stateRegion: string;
      country: string;
      occupation: string;
      company: string | null;
      taxId: string | null;
      businessName: string | null;
      instagram: string | null;
      knowsExistingCustomer: boolean;
      knownCustomerName: string | null;
      contact1Name: string;
      contact1Phone: string;
      contact1Relationship: string;
      contact2Name: string;
      contact2Phone: string;
      contact2Relationship: string;
      rejectionReason: string | null;
      reviewedAt: string | null;
      reviewedById: string | null;
      createdAt: string;
      updatedAt: string;
    };
  },
  GetCustomerProfileDetailError
>;

@QueryHandler(GetCustomerProfileDetailQuery)
export class GetCustomerProfileDetailHandler implements IQueryHandler<
  GetCustomerProfileDetailQuery,
  GetCustomerProfileDetailResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCustomerProfileDetailQuery): Promise<GetCustomerProfileDetailResult> {
    const context = {
      useCase: 'GetCustomerProfileDetail',
      tenantId: query.tenantId,
      customerId: query.customerId,
    };
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: query.customerId,
        tenantId: query.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        isCompany: true,
        companyName: true,
        isActive: true,
        onboardingStatus: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            birthDate: true,
            documentNumber: true,
            identityDocumentPath: true,
            address: true,
            city: true,
            stateRegion: true,
            country: true,
            occupation: true,
            company: true,
            taxId: true,
            businessName: true,
            instagram: true,
            knowsExistingCustomer: true,
            knownCustomerName: true,
            contact1Name: true,
            contact1Phone: true,
            contact1Relationship: true,
            contact2Name: true,
            contact2Phone: true,
            contact2Relationship: true,
            rejectionReason: true,
            reviewedAt: true,
            reviewedById: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!customer) {
      return err(
        getCustomerProfileDetailError(
          'tenant_management.rental_customer_not_found',
          `Rental customer "${query.customerId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (!customer.profile) {
      return err(
        getCustomerProfileDetailError(
          'tenant_management.customer_profile_not_found',
          `Profile for rental customer "${query.customerId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    return ok({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      isCompany: customer.isCompany,
      companyName: customer.companyName,
      isActive: customer.isActive,
      onboardingStatus: customer.onboardingStatus,
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
      profile: {
        id: customer.profile.id,
        fullName: customer.profile.fullName,
        phone: customer.profile.phone,
        birthDate: prismaDateToLocalDate(customer.profile.birthDate),
        documentNumber: customer.profile.documentNumber,
        identityDocumentPath: customer.profile.identityDocumentPath,
        address: customer.profile.address,
        city: customer.profile.city,
        stateRegion: customer.profile.stateRegion,
        country: customer.profile.country,
        occupation: customer.profile.occupation,
        company: customer.profile.company,
        taxId: customer.profile.taxId,
        businessName: customer.profile.businessName,
        instagram: customer.profile.instagram,
        knowsExistingCustomer: customer.profile.knowsExistingCustomer,
        knownCustomerName: customer.profile.knownCustomerName,
        contact1Name: customer.profile.contact1Name,
        contact1Phone: customer.profile.contact1Phone,
        contact1Relationship: customer.profile.contact1Relationship,
        contact2Name: customer.profile.contact2Name,
        contact2Phone: customer.profile.contact2Phone,
        contact2Relationship: customer.profile.contact2Relationship,
        rejectionReason: customer.profile.rejectionReason,
        reviewedAt: customer.profile.reviewedAt?.toISOString() ?? null,
        reviewedById: customer.profile.reviewedById,
        createdAt: customer.profile.createdAt.toISOString(),
        updatedAt: customer.profile.updatedAt.toISOString(),
      },
    });
  }
}
