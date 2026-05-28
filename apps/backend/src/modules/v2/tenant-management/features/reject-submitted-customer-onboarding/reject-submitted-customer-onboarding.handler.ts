import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';

import {
  rejectSubmittedCustomerOnboardingApplicationError,
  RejectSubmittedCustomerOnboardingApplicationError,
} from './reject-submitted-customer-onboarding-application.error';
import { RejectSubmittedCustomerOnboardingCommand } from './reject-submitted-customer-onboarding.command';

export type RejectSubmittedCustomerOnboardingResult = Result<void, RejectSubmittedCustomerOnboardingApplicationError>;

@CommandHandler(RejectSubmittedCustomerOnboardingCommand)
export class RejectSubmittedCustomerOnboardingHandler implements ICommandHandler<
  RejectSubmittedCustomerOnboardingCommand,
  RejectSubmittedCustomerOnboardingResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: RejectSubmittedCustomerOnboardingCommand): Promise<RejectSubmittedCustomerOnboardingResult> {
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
        rejectSubmittedCustomerOnboardingApplicationError(
          'RentalCustomerNotFound',
          `Rental customer "${command.customerId}" was not found.`,
        ),
      );
    }

    if (!customer.profile) {
      return err(
        rejectSubmittedCustomerOnboardingApplicationError(
          'CustomerProfileNotFound',
          `Profile for rental customer "${command.customerId}" was not found.`,
        ),
      );
    }

    if (customer.onboardingStatus !== 'PENDING') {
      return err(
        rejectSubmittedCustomerOnboardingApplicationError(
          'CustomerOnboardingNotPending',
          `Rental customer "${command.customerId}" onboarding is not pending.`,
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
