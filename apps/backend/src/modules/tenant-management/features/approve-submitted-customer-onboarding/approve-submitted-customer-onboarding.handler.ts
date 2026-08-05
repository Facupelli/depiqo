import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import { ApproveSubmittedCustomerOnboardingCommand } from './approve-submitted-customer-onboarding.command';
import {
  approveSubmittedCustomerOnboardingError,
  ApproveSubmittedCustomerOnboardingError,
} from './approve-submitted-customer-onboarding.errors';

export type ApproveSubmittedCustomerOnboardingResult = Result<void, ApproveSubmittedCustomerOnboardingError>;

@CommandHandler(ApproveSubmittedCustomerOnboardingCommand)
export class ApproveSubmittedCustomerOnboardingHandler implements ICommandHandler<
  ApproveSubmittedCustomerOnboardingCommand,
  ApproveSubmittedCustomerOnboardingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ApproveSubmittedCustomerOnboardingCommand): Promise<ApproveSubmittedCustomerOnboardingResult> {
    const context = {
      useCase: 'ApproveSubmittedCustomerOnboarding',
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
        approveSubmittedCustomerOnboardingError(
          'tenant_management.rental_customer_not_found',
          `Rental customer "${command.customerId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (!customer.profile) {
      return err(
        approveSubmittedCustomerOnboardingError(
          'tenant_management.customer_profile_not_found',
          `Profile for rental customer "${command.customerId}" was not found.`,
          undefined,
          context,
        ),
      );
    }

    if (customer.onboardingStatus !== 'PENDING') {
      return err(
        approveSubmittedCustomerOnboardingError(
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
        data: { onboardingStatus: 'APPROVED' },
      }),
      this.prisma.client.v2CustomerProfile.update({
        where: { customerId: customer.id },
        data: {
          reviewedAt: new Date(),
          reviewedById: command.reviewedById,
          rejectionReason: null,
        },
      }),
    ]);

    return ok(undefined);
  }
}
