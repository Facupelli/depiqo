import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from 'src/core/database/prisma.service';
import { isCustomerIdentityDocumentReference } from '../../customer/customer-identity-document-reference';
import { GetCustomerIdentityDocumentDescriptorQuery } from './get-customer-identity-document-descriptor.query';

@QueryHandler(GetCustomerIdentityDocumentDescriptorQuery)
export class GetCustomerIdentityDocumentDescriptorHandler implements IQueryHandler<GetCustomerIdentityDocumentDescriptorQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetCustomerIdentityDocumentDescriptorQuery): Promise<string | null> {
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: { id: query.customerId, tenantId: query.tenantId, deletedAt: null },
      select: { id: true, profile: { select: { identityDocumentPath: true } } },
    });

    const reference = customer?.profile?.identityDocumentPath;
    return customer && reference && isCustomerIdentityDocumentReference(reference, customer.id) ? reference : null;
  }
}
