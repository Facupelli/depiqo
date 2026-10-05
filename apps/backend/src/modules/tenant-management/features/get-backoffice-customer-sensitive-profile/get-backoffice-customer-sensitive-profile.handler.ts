import type { GetBackofficeCustomerSensitiveProfileResponseDto } from '@repo/api-contracts';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import { PrismaService } from 'src/core/database/prisma.service';
import { prismaDateToLocalDate } from 'src/core/temporal/local-date';
import { GetBackofficeCustomerSensitiveProfileQuery } from './get-backoffice-customer-sensitive-profile.query';

@QueryHandler(GetBackofficeCustomerSensitiveProfileQuery)
export class GetBackofficeCustomerSensitiveProfileHandler implements IQueryHandler<GetBackofficeCustomerSensitiveProfileQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    query: GetBackofficeCustomerSensitiveProfileQuery,
  ): Promise<GetBackofficeCustomerSensitiveProfileResponseDto | null> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: { id: query.customerId, tenantId: query.tenantId, deletedAt: null },
      select: {
        id: true,
        onboardingStatus: true,
        profile: {
          select: {
            birthDate: true,
            address: true,
            documentNumber: true,
            taxId: true,
            contact1Name: true,
            contact1Phone: true,
            contact1Relationship: true,
            contact2Name: true,
            contact2Phone: true,
            contact2Relationship: true,
            rejectionReason: true,
          },
        },
      },
    });
    if (!customer) return null;

    const profile = customer.profile;
    return {
      customerId: customer.id,
      submittedProfile: profile
        ? {
            birthDate: prismaDateToLocalDate(profile.birthDate),
            address: profile.address,
            documentNumber: profile.documentNumber,
            taxId: profile.taxId,
            referenceContacts: [
              { name: profile.contact1Name, phone: profile.contact1Phone, relationship: profile.contact1Relationship },
              { name: profile.contact2Name, phone: profile.contact2Phone, relationship: profile.contact2Relationship },
            ],
            rejectionReason: customer.onboardingStatus === 'REJECTED' ? profile.rejectionReason : null,
          }
        : null,
    };
  }
}
