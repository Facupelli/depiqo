import { Module } from '@nestjs/common';

import { RentalCommitmentModule } from '../rental-commitment/rental-commitment.module';
import { TenantManagementModule } from '../tenant-management/tenant-management.module';
import { CorrectInvoiceRegistrationHttpController } from './features/correct-invoice-registration/correct-invoice-registration.controller';
import { CorrectInvoiceRegistrationHandler } from './features/correct-invoice-registration/correct-invoice-registration.handler';
import { GetInvoiceHttpController } from './features/get-invoice/get-invoice.controller';
import { GetInvoiceHandler } from './features/get-invoice/get-invoice.handler';
import { GetRentalInvoicesHttpController } from './features/get-rental-invoices/get-rental-invoices.controller';
import { GetRentalInvoicesHandler } from './features/get-rental-invoices/get-rental-invoices.handler';
import { RegisterExternalInvoiceHttpController } from './features/register-external-invoice/register-external-invoice.controller';
import { RegisterExternalInvoiceHandler } from './features/register-external-invoice/register-external-invoice.handler';
import { RemoveInvoiceRegistrationHttpController } from './features/remove-invoice-registration/remove-invoice-registration.controller';
import { RemoveInvoiceRegistrationHandler } from './features/remove-invoice-registration/remove-invoice-registration.handler';

@Module({
  imports: [RentalCommitmentModule, TenantManagementModule],
  controllers: [
    RegisterExternalInvoiceHttpController,
    GetInvoiceHttpController,
    GetRentalInvoicesHttpController,
    CorrectInvoiceRegistrationHttpController,
    RemoveInvoiceRegistrationHttpController,
  ],
  providers: [
    RegisterExternalInvoiceHandler,
    GetInvoiceHandler,
    GetRentalInvoicesHandler,
    CorrectInvoiceRegistrationHandler,
    RemoveInvoiceRegistrationHandler,
  ],
})
export class InvoicingModule {}
