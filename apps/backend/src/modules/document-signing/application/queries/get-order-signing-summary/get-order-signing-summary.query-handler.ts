import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { DocumentSigningRequestStatus, SigningDocumentType } from 'src/generated/prisma/client';

import { PrismaService } from 'src/core/database/prisma.service';
import {
  DocumentSigningPublicDocumentType,
  DocumentSigningPublicDocumentTypes,
  GetOrderSigningSummaryQuery,
  OrderSigningSummaryReadModel,
  OrderSigningSummaryStatus,
} from 'src/modules/document-signing/public/queries/get-order-signing-summary.query';

@QueryHandler(GetOrderSigningSummaryQuery)
export class GetOrderSigningSummaryQueryHandler implements IQueryHandler<
  GetOrderSigningSummaryQuery,
  OrderSigningSummaryReadModel
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrderSigningSummaryQuery): Promise<OrderSigningSummaryReadModel> {
    const request = await this.prisma.client.documentSigningRequest.findFirst({
      where: {
        tenantId: query.tenantId,
        orderId: query.orderId,
        documentType: mapPublicDocumentTypeToPrisma(query.documentType),
      },
      orderBy: { createdAt: 'desc' },
      select: {
        documentType: true,
        recipientEmail: true,
        status: true,
        createdAt: true,
        expiresAt: true,
        signedAt: true,
      },
    });

    if (!request) {
      return buildNoRequestSummary();
    }

    return {
      status: resolveEffectiveStatus(request.status, request.expiresAt, new Date()),
      documentType: mapPrismaDocumentTypeToPublic(request.documentType),
      recipientEmail: request.recipientEmail,
      createdAt: request.createdAt,
      expiresAt: request.expiresAt,
      signedAt: request.signedAt,
    };
  }
}

function mapPublicDocumentTypeToPrisma(documentType: DocumentSigningPublicDocumentType): SigningDocumentType {
  switch (documentType) {
    case DocumentSigningPublicDocumentTypes.RENTAL_AGREEMENT:
      return SigningDocumentType.RENTAL_AGREEMENT;
    default:
      return assertUnreachable(documentType);
  }
}

function mapPrismaDocumentTypeToPublic(documentType: SigningDocumentType): DocumentSigningPublicDocumentType {
  switch (documentType) {
    case SigningDocumentType.RENTAL_AGREEMENT:
      return DocumentSigningPublicDocumentTypes.RENTAL_AGREEMENT;
    default:
      return assertUnreachable(documentType);
  }
}

function buildNoRequestSummary(): OrderSigningSummaryReadModel {
  return {
    status: 'NO_REQUEST',
    documentType: null,
    recipientEmail: null,
    createdAt: null,
    expiresAt: null,
    signedAt: null,
  };
}

function resolveEffectiveStatus(
  status: DocumentSigningRequestStatus,
  expiresAt: Date,
  now: Date,
): OrderSigningSummaryStatus {
  if (status === DocumentSigningRequestStatus.PENDING && expiresAt.getTime() <= now.getTime()) {
    return 'EXPIRED';
  }

  return status;
}

function assertUnreachable(value: never): never {
  throw new Error(`Unsupported document signing document type: ${String(value)}`);
}
