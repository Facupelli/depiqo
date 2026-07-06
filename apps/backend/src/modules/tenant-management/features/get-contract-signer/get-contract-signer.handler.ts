import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetContractSignerResponseDto } from '@repo/api-contracts';

import { PrismaService } from 'src/core/database/prisma.service';

import { GetContractSignerQuery } from './get-contract-signer.query';

export type GetContractSignerResult = GetContractSignerResponseDto;

@QueryHandler(GetContractSignerQuery)
export class GetContractSignerHandler implements IQueryHandler<GetContractSignerQuery, GetContractSignerResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetContractSignerQuery): Promise<GetContractSignerResult> {
    const signer = await this.prisma.client.v2TenantContractSigner.findFirst({
      where: {
        tenantId: query.tenantId,
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        fullName: true,
        documentNumber: true,
        phone: true,
        address: true,
        signatureUrl: true,
        isDefault: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!signer) {
      return null;
    }

    return {
      id: signer.id,
      fullName: signer.fullName,
      documentNumber: signer.documentNumber,
      phone: signer.phone,
      address: signer.address,
      signatureUrl: signer.signatureUrl,
      isDefault: signer.isDefault,
      isActive: signer.isActive,
      createdAt: signer.createdAt.toISOString(),
      updatedAt: signer.updatedAt.toISOString(),
    };
  }
}
