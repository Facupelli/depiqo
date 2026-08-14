import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { RejectSubmittedCustomerOnboardingCommand } from './reject-submitted-customer-onboarding.command';
import {
  rejectSubmittedCustomerOnboardingError,
  RejectSubmittedCustomerOnboardingError,
} from './reject-submitted-customer-onboarding.errors';

export type RejectSubmittedCustomerOnboardingResult = Result<void, RejectSubmittedCustomerOnboardingError>;

@CommandHandler(RejectSubmittedCustomerOnboardingCommand)
export class RejectSubmittedCustomerOnboardingHandler implements ICommandHandler<
  RejectSubmittedCustomerOnboardingCommand,
  RejectSubmittedCustomerOnboardingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RejectSubmittedCustomerOnboardingCommand): Promise<RejectSubmittedCustomerOnboardingResult> {
    const context = {
      useCase: 'RejectSubmittedCustomerOnboarding',
      tenantId: command.tenantId,
      customerId: command.customerId,
    };
    const customer = await this.prisma.client.v2RentalCustomer.findFirst({
      where: {
        id: command.customerId,
        tenantId: command.tenantId,
        deletedAt: null,
      },
      select: {
        id: true,
        onboardingStatus: true,
        profile: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!customer) {
      return err(
        rejectSubmittedCustomerOnboardingError(
          'tenant_management.rental_customer_not_found',
          `Rental customer "${command.customerId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (!customer.profile) {
      return err(
        rejectSubmittedCustomerOnboardingError(
          'tenant_management.customer_profile_not_found',
          `Profile for rental customer "${command.customerId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (customer.onboardingStatus !== 'PENDING') {
      return err(
        rejectSubmittedCustomerOnboardingError(
          'tenant_management.customer_onboarding_not_pending',
          `Rental customer "${command.customerId}" onboarding is not pending.`,
          undefined,
          context,
        ),
      );
    }

    await this.prisma.client.$transaction([
      this.prisma.client.v2RentalCustomer.update({
        where: { id: customer.id },
        data: { onboardingStatus: 'REJECTED' },
      }),
      this.prisma.client.v2CustomerProfile.update({
        where: { customerId: customer.id },
        data: {
          rejectionReason: command.rejectionReason,
          reviewedAt: new Date(),
          reviewedById: command.reviewedById,
        },
      }),
    ]);

    return ok(undefined);
  }
}
