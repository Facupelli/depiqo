import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CorrectInvoiceRegistrationBodySchema, InvoiceRegistrationFieldsSchema } from '@repo/api-contracts';
import { err, ok, type Result } from 'neverthrow';

import { PrismaUnitOfWork } from 'src/core/database/prisma-unit-of-work';
import { localDateToPrismaDate } from 'src/core/temporal/local-date';
import { Prisma } from 'src/generated/prisma/client';
import { invoiceSelect, toInvoiceSnapshot } from '../../persistence/invoice-snapshot';
import { CorrectInvoiceRegistrationCommand } from './correct-invoice-registration.command';
import {
  correctInvoiceRegistrationError,
  type CorrectInvoiceRegistrationError,
} from './correct-invoice-registration.errors';

export type CorrectInvoiceRegistrationResult = Result<
  { id: string; version: number; updatedAt: Date },
  CorrectInvoiceRegistrationError
>;

@CommandHandler(CorrectInvoiceRegistrationCommand)
export class CorrectInvoiceRegistrationHandler implements ICommandHandler<
  CorrectInvoiceRegistrationCommand,
  CorrectInvoiceRegistrationResult
> {
  constructor(private readonly unitOfWork: PrismaUnitOfWork) {}

  async execute(command: CorrectInvoiceRegistrationCommand): Promise<CorrectInvoiceRegistrationResult> {
    const { tenantId, tenantUserId, invoiceId, expectedVersion } = command.props;
    const context = { useCase: 'CorrectInvoiceRegistration', tenantId, tenantUserId, invoiceId };

    return this.unitOfWork.runResultInTransaction(async ({ tx }): Promise<CorrectInvoiceRegistrationResult> => {
      const current = await tx.v2Invoice.findFirst({
        where: { id: invoiceId, tenantId },
        select: invoiceSelect,
      });
      if (!current) {
        return err(
          correctInvoiceRegistrationError(
            'invoicing.invoice_not_found',
            'Invoice registration not found.',
            undefined,
            context,
          ),
        );
      }
      if (current.removedAt !== null) {
        return err(
          correctInvoiceRegistrationError(
            'invoicing.invoice_registration_removed',
            'Invoice registration has been removed.',
            undefined,
            context,
          ),
        );
      }
      if (current.version !== expectedVersion) {
        return err(
          correctInvoiceRegistrationError(
            'invoicing.invoice_version_conflict',
            'Invoice registration was modified by another request.',
            undefined,
            context,
          ),
        );
      }

      const correction = CorrectInvoiceRegistrationBodySchema.safeParse({ ...command.props.patch, expectedVersion });
      if (!correction.success) {
        return err(
          correctInvoiceRegistrationError(
            'invoicing.invalid_registration',
            'Invoice registration correction values are invalid.',
            correction.error,
            context,
          ),
        );
      }
      const patch = {
        ...correction.data,
        amount: correction.data.amount === undefined ? undefined : new Prisma.Decimal(correction.data.amount).toFixed(),
      };
      const snapshot = toInvoiceSnapshot(current);
      const changed = InvoiceRegistrationFieldsSchema.keyof().options.some(
        (field) => patch[field] !== undefined && patch[field] !== snapshot[field],
      );
      if (!changed) {
        return ok({ id: current.id, version: current.version, updatedAt: current.updatedAt });
      }

      const correctedAt = new Date();
      const updated = await tx.v2Invoice.updateMany({
        where: { id: invoiceId, tenantId, removedAt: null, version: expectedVersion },
        data: {
          reference: patch.reference,
          issuedOn: patch.issuedOn === undefined ? undefined : localDateToPrismaDate(patch.issuedOn),
          amount: patch.amount,
          externalUrl: patch.externalUrl,
          sourceSystem: patch.sourceSystem,
          updatedAt: correctedAt,
          updatedByTenantUserId: tenantUserId,
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        return err(
          correctInvoiceRegistrationError(
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
          action: 'CORRECTED',
          actorTenantUserId: tenantUserId,
          occurredAt: correctedAt,
          snapshot: toInvoiceSnapshot(invoice),
        },
      });
      return ok({ id: invoice.id, version: invoice.version, updatedAt: invoice.updatedAt });
    });
  }
}
