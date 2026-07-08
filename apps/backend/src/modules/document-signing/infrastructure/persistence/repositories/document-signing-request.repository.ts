import { Injectable } from '@nestjs/common';

import { DocumentSigningRequestStatus, Prisma, SigningDocumentType } from 'src/generated/prisma/client';
import { PrismaTransactionClient } from 'src/core/database/prisma-unit-of-work';
import { PrismaService } from 'src/core/database/prisma.service';
import { DocumentSigningRequest } from 'src/modules/document-signing/domain/entities/document-signing-request.entity';

import { DocumentSigningRequestMapper } from '../mappers/document-signing-request.mapper';

@Injectable()
export class DocumentSigningRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async runWithActiveRequestLock<T>(
    tenantId: string,
    orderId: string,
    documentType: SigningDocumentType,
    work: (tx: PrismaTransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.prisma.client.$transaction(async (tx) => {
      await tx.$executeRaw`
        SELECT pg_advisory_xact_lock(hashtext(${tenantId}), hashtext(${`${orderId}:${documentType}`}))
      `;

      return work(tx);
    });
  }

  async findByTokenHash(tokenHash: string, tx?: PrismaTransactionClient): Promise<DocumentSigningRequest | null> {
    const client = tx ?? this.prisma.client;
    const record = await client.documentSigningRequest.findFirst({
      where: { tokenHash },
    });

    return record ? DocumentSigningRequestMapper.toDomain(record) : null;
  }

  async findLatestForOrderDocument(
    tenantId: string,
    orderId: string,
    documentType: SigningDocumentType,
    tx?: PrismaTransactionClient,
  ): Promise<DocumentSigningRequest | null> {
    const client = tx ?? this.prisma.client;
    const record = await client.documentSigningRequest.findFirst({
      where: {
        tenantId,
        orderId,
        documentType,
      },
      orderBy: { createdAt: 'desc' },
    });

    return record ? DocumentSigningRequestMapper.toDomain(record) : null;
  }

  async findPendingForOrderDocument(
    tenantId: string,
    orderId: string,
    documentType: SigningDocumentType,
    tx?: PrismaTransactionClient,
  ): Promise<DocumentSigningRequest | null> {
    const client = tx ?? this.prisma.client;
    const record = await client.documentSigningRequest.findFirst({
      where: {
        tenantId,
        orderId,
        documentType,
        status: DocumentSigningRequestStatus.PENDING,
      },
      orderBy: { createdAt: 'desc' },
    });

    return record ? DocumentSigningRequestMapper.toDomain(record) : null;
  }

  async findLatestSignedForOrderDocument(
    tenantId: string,
    orderId: string,
    documentType: SigningDocumentType,
    tx?: PrismaTransactionClient,
  ): Promise<DocumentSigningRequest | null> {
    const client = tx ?? this.prisma.client;
    const record = await client.documentSigningRequest.findFirst({
      where: {
        tenantId,
        orderId,
        documentType,
        status: DocumentSigningRequestStatus.SIGNED,
      },
      orderBy: { signedAt: 'desc' },
    });

    return record ? DocumentSigningRequestMapper.toDomain(record) : null;
  }

  async save(request: DocumentSigningRequest, tx?: PrismaTransactionClient): Promise<string> {
    const client = tx ?? this.prisma.client;
    const row = DocumentSigningRequestMapper.toPersistence(request);

    await client.documentSigningRequest.upsert({
      where: { id: request.id },
      create: row,
      update: row as Prisma.DocumentSigningRequestUncheckedUpdateInput,
    });

    return request.id;
  }
}
