import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, type Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { invoiceSelect, toInvoiceSnapshot } from '../../persistence/invoice-snapshot';
import { RemoveInvoiceRegistrationCommand } from './remove-invoice-registration.command';
import {
  removeInvoiceRegistrationError,
  type RemoveInvoiceRegistrationError,
} from './remove-invoice-registration.errors';

export type RemoveInvoiceRegistrationResult = Result<void, RemoveInvoiceRegistrationError>;

@CommandHandler(RemoveInvoiceRegistrationCommand)
export class RemoveInvoiceRegistrationHandler implements ICommandHandler<
  RemoveInvoiceRegistrationCommand,
  RemoveInvoiceRegistrationResult
> {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {}

  async execute(command: RemoveInvoiceRegistrationCommand): Promise<RemoveInvoiceRegistrationResult> {
    const { tenantId, tenantUserId, invoiceId, expectedVersion } = command.props;
    const context = { useCase: 'RemoveInvoiceRegistration', tenantId, tenantUserId, invoiceId };

    return this.unitOfWork.runResultInTransaction(async ({ tx }): Promise<RemoveInvoiceRegistrationResult> => {
      const current = await tx.v2Invoice.findFirst({
        where: { id: invoiceId, tenantId },
        select: { removedAt: true, version: true },
      });
      if (!current) {
        return err(
          removeInvoiceRegistrationError(
            'invoicing.invoice_not_found',
            'Invoice registration not found.',
            undefined,
            context,
          ),
        );
      }
      if (current.removedAt !== null) {
        return err(
          removeInvoiceRegistrationError(
            'invoicing.invoice_registration_removed',
            'Invoice registration has been removed.',
            undefined,
            context,
          ),
        );
      }
      if (current.version !== expectedVersion) {
        return err(
          removeInvoiceRegistrationError(
            'invoicing.invoice_version_conflict',
            'Invoice registration was modified by another request.',
            undefined,
            context,
          ),
        );
      }

      const removedAt = new Date();
      const updated = await tx.v2Invoice.updateMany({
        where: { id: invoiceId, tenantId, removedAt: null, version: expectedVersion },
        data: {
          removedAt,
          removedByTenantUserId: tenantUserId,
          updatedAt: removedAt,
          updatedByTenantUserId: tenantUserId,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        return err(
          removeInvoiceRegistrationError(
            'invoicing.invoice_version_conflict',
            'Invoice registration was modified by another request.',
            undefined,
            context,
          ),
        );
      }

      const invoice = await tx.v2Invoice.findFirstOrThrow({
        where: { id: invoiceId, tenantId, version: expectedVersion + 1 },
        select: invoiceSelect,
      });
      await tx.v2InvoiceHistoryEntry.create({
        data: {
          tenantId,
          invoiceId,
          version: invoice.version,
          action: 'REMOVED',
          actorTenantUserId: tenantUserId,
          occurredAt: removedAt,
          snapshot: toInvoiceSnapshot(invoice),
        },
      });
      return ok(undefined);
    });
  }
}
