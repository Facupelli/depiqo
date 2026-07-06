import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { getOwnerDetailApplicationError, GetOwnerDetailApplicationError } from './get-owner-detail-application.error';
import { GetOwnerDetailQuery } from './get-owner-detail.query';

export interface GetOwnerDetailContractReadModel {
  id: string;
  assetId: string | null;
  terms: unknown;
  basis: 'GROSS' | 'NET';
  ownerShare: string;
  rentalShare: string;
  validFrom: string;
  validTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GetOwnerDetailReadModel {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  contracts: GetOwnerDetailContractReadModel[];
}

export type GetOwnerDetailResult = Result<GetOwnerDetailReadModel, GetOwnerDetailApplicationError>;

function getNullableStringFromJson(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const fieldValue = (value as Record<string, unknown>)[key];

  return typeof fieldValue === 'string' && fieldValue.trim().length > 0 ? fieldValue : null;
}

@QueryHandler(GetOwnerDetailQuery)
export class GetOwnerDetailHandler implements IQueryHandler<GetOwnerDetailQuery, GetOwnerDetailResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOwnerDetailQuery): Promise<GetOwnerDetailResult> {
    const owner = await this.prisma.client.v2AssetOwner.findFirst({
      where: {
        id: query.ownerId,
        tenantId: query.tenantId,
      },
      select: {
        id: true,
        name: true,
        contactInfo: true,
        createdAt: true,
        updatedAt: true,
        contracts: {
          where: { tenantId: query.tenantId },
          select: {
            id: true,
            assetId: true,
            terms: true,
            basis: true,
            ownerShare: true,
            rentalShare: true,
            validFrom: true,
            validTo: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: [{ validFrom: 'desc' }, { createdAt: 'desc' }],
        },
      },
    });

    if (!owner) {
      return err(getOwnerDetailApplicationError('OwnerNotFound', `Owner "${query.ownerId}" was not found.`));
    }

    return ok({
      id: owner.id,
      name: owner.name,
      email: getNullableStringFromJson(owner.contactInfo, 'email'),
      phone: getNullableStringFromJson(owner.contactInfo, 'phone'),
      notes: getNullableStringFromJson(owner.contactInfo, 'notes'),
      createdAt: owner.createdAt.toISOString(),
      updatedAt: owner.updatedAt.toISOString(),
      contracts: owner.contracts.map((contract) => ({
        id: contract.id,
        assetId: contract.assetId,
        terms: contract.terms,
        basis: contract.basis,
        ownerShare: contract.ownerShare.toString(),
        rentalShare: contract.rentalShare.toString(),
        validFrom: contract.validFrom.toISOString(),
        validTo: contract.validTo?.toISOString() ?? null,
        createdAt: contract.createdAt.toISOString(),
        updatedAt: contract.updatedAt.toISOString(),
      })),
    });
  }
}
