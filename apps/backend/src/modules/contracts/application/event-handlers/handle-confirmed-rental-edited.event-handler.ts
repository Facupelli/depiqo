import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { PrismaService } from 'src/core/database/prisma.service';
import { V2ContractStatus, V2DocumentSigningRequestStatus } from 'src/generated/prisma/enums';
import { ConfirmedRentalEditedIntegrationEvent } from 'src/modules/rental-commitment/public-api/events/rental-lifecycle.integration-events';

@Injectable()
export class HandleConfirmedRentalEditedEventHandler {
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(ConfirmedRentalEditedIntegrationEvent.name)
  async handle(event: ConfirmedRentalEditedIntegrationEvent): Promise<void> {
    const contract = await this.prisma.client.v2Contract.findUnique({
      where: {
        tenantId_rentalId: {
          tenantId: event.tenantId,
          rentalId: event.rentalId,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!contract) {
      return;
    }

    await this.prisma.client.$transaction(async (tx) => {
      switch (contract.status) {
        case V2ContractStatus.GENERATED:
          await tx.v2Contract.update({
            where: { id: contract.id },
            data: { status: V2ContractStatus.DRAFT },
          });
          return;

        case V2ContractStatus.SIGNING_REQUESTED:
          await tx.v2DocumentSigningRequest.updateMany({
            where: {
              tenantId: event.tenantId,
              contractId: contract.id,
              status: {
                in: [
                  V2DocumentSigningRequestStatus.PENDING,
                  V2DocumentSigningRequestStatus.SENT,
                  V2DocumentSigningRequestStatus.VIEWED,
                ],
              },
            },
            data: {
              status: V2DocumentSigningRequestStatus.CANCELLED,
              cancelledAt: new Date(),
            },
          });
          await tx.v2Contract.update({
            where: { id: contract.id },
            data: { status: V2ContractStatus.DRAFT },
          });
          return;

        case V2ContractStatus.SIGNED:
          await tx.v2Contract.update({
            where: { id: contract.id },
            data: { status: V2ContractStatus.RESIGN_REQUIRED },
          });
          return;

        case V2ContractStatus.DRAFT:
        case V2ContractStatus.RESIGN_REQUIRED:
        case V2ContractStatus.VOID:
          return;
      }
    });
  }
}
