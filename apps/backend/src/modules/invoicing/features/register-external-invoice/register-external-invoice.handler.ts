import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { localDateToPrismaDate } from 'src/core/temporal/local-date';
import { AcceptedRentalPricingFacts } from 'src/modules/rental-commitment/public-api/accepted-rental-pricing-facts.public-api';
import { RentalLifecycleFacts } from 'src/modules/rental-commitment/public-api/rental-lifecycle-facts.public-api';

import { canRegisterInvoice, validateInvoiceRegistration } from '../../application/invoice-registration-validation';
import { invoiceSelect, toInvoiceSnapshot } from '../../persistence/invoice-snapshot';
import { RegisterExternalInvoiceCommand } from './register-external-invoice.command';
import { registerExternalInvoiceError, type RegisterExternalInvoiceError } from './register-external-invoice.errors';

export type RegisterExternalInvoiceResult = Result<{ id: string; version: number }, RegisterExternalInvoiceError>;

@CommandHandler(RegisterExternalInvoiceCommand)
export class RegisterExternalInvoiceHandler implements ICommandHandler<
  RegisterExternalInvoiceCommand,
  RegisterExternalInvoiceResult
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rentalLifecycleFacts: RentalLifecycleFacts,
    private readonly acceptedRentalPricingFacts: AcceptedRentalPricingFacts,
  ) {}

  async execute(command: RegisterExternalInvoiceCommand): Promise<RegisterExternalInvoiceResult> {
    const { tenantId, tenantUserId, rentalId } = command.props;
    const context = { useCase: 'RegisterExternalInvoice', tenantId, tenantUserId, rentalId };
    const registration = validateInvoiceRegistration({
      reference: command.props.reference,
      issuedOn: command.props.issuedOn,
      amount: command.props.amount,
      externalUrl: command.props.externalUrl,
      sourceSystem: command.props.sourceSystem,
    });
    if (!registration.success) {
      return err(
        registerExternalInvoiceError(
          'invoicing.invalid_registration',
          'Invoice registration values are invalid.',
          registration.error,
          context,
        ),
      );
    }

    const lifecycle = await this.rentalLifecycleFacts.getRentalLifecycleFacts({ tenantId, rentalId });
    if (lifecycle.isErr()) {
      return err(
        registerExternalInvoiceError('invoicing.rental_not_found', lifecycle.error.message, lifecycle.error, context),
      );
    }
    if (!canRegisterInvoice(lifecycle.value.status, lifecycle.value.confirmedAt)) {
      return err(
        registerExternalInvoiceError(
          'invoicing.rental_not_eligible',
          'Invoice registration requires a confirmed, completed, or previously confirmed cancelled rental.',
          undefined,
          context,
        ),
      );
    }

    const pricing = await this.acceptedRentalPricingFacts.getAcceptedRentalPricingFacts({ tenantId, rentalId });
    if (pricing.isErr()) {
      if (pricing.error.code === 'RentalNotFound') {
        return err(
          registerExternalInvoiceError('invoicing.rental_not_found', pricing.error.message, pricing.error, context),
        );
      }
      throw new Error('Accepted rental pricing facts are invalid for invoice registration.', { cause: pricing.error });
    }
    const currency = pricing.value.total.currency;
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new Error('Accepted rental currency is invalid for invoice registration.');
    }

    const result = await this.prisma.client.$transaction(async (tx) => {
      const registeredAt = new Date();
      const invoice = await tx.v2Invoice.create({
        data: {
          tenantId,
          rentalId,
          origin: 'EXTERNAL',
          reference: registration.data.reference,
          issuedOn: localDateToPrismaDate(registration.data.issuedOn),
          amount: registration.data.amount,
          currency,
          externalUrl: registration.data.externalUrl ?? null,
          sourceSystem: registration.data.sourceSystem ?? null,
          createdAt: registeredAt,
          createdByTenantUserId: tenantUserId,
          updatedAt: registeredAt,
          updatedByTenantUserId: tenantUserId,
        },
        select: invoiceSelect,
      });
      await tx.v2InvoiceHistoryEntry.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          version: invoice.version,
          action: 'REGISTERED',
          actorTenantUserId: tenantUserId,
          occurredAt: registeredAt,
          snapshot: toInvoiceSnapshot(invoice),
        },
      });
      return { id: invoice.id, version: invoice.version };
    });

    return ok(result);
  }
}
