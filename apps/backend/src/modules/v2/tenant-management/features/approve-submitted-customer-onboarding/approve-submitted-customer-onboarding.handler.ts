import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  approveSubmittedCustomerOnboardingApplicationError,
  ApproveSubmittedCustomerOnboardingApplicationError,
} from './approve-submitted-customer-onboarding-application.error';
import { ApproveSubmittedCustomerOnboardingCommand } from './approve-submitted-customer-onboarding.command';

export type ApproveSubmittedCustomerOnboardingResult = Result<void, ApproveSubmittedCustomerOnboardingApplicationError>;

@CommandHandler(ApproveSubmittedCustomerOnboardingCommand)
export class ApproveSubmittedCustomerOnboardingHandler implements ICommandHandler<
  ApproveSubmittedCustomerOnboardingCommand,
  ApproveSubmittedCustomerOnboardingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ApproveSubmittedCustomerOnboardingCommand): Promise<ApproveSubmittedCustomerOnboardingResult> {
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
        approveSubmittedCustomerOnboardingApplicationError(
          'RentalCustomerNotFound',
          `Rental customer "${command.customerId}" was not found.`,
        ),
      );
    }

    if (!customer.profile) {
      return err(
        approveSubmittedCustomerOnboardingApplicationError(
          'CustomerProfileNotFound',
          `Profile for rental customer "${command.customerId}" was not found.`,
        ),
      );
    }

    if (customer.onboardingStatus !== 'PENDING') {
      return err(
        approveSubmittedCustomerOnboardingApplicationError(
          'CustomerOnboardingNotPending',
          `Rental customer "${command.customerId}" onboarding is not pending.`,
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
