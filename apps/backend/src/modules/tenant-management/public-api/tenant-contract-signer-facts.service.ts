import { Injectable } from '@nestjs/common';

import { PrismaService } from 'src/core/database/prisma.service';

import { TenantContractSignerFact, TenantContractSignerFacts } from './tenant-contract-signer-facts.public-api';

@Injectable()
export class TenantContractSignerFactsService extends TenantContractSignerFacts {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getSelectedTenantContractSignerFacts(input: { tenantId: string }): Promise<TenantContractSignerFact | null> {
    return this.prisma.client.v2TenantContractSigner.findFirst({
      where: { tenantId: input.tenantId, isActive: true, deletedAt: null },
      select: {
        fullName: true,
        documentNumber: true,
        address: true,
        phone: true,
        signatureUrl: true,
      },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }
}
