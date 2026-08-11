import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { localDateToPrismaDate } from 'src/core/temporal/local-date';
import { V2RentalCustomerOnboardingStatus } from 'src/generated/prisma/enums';

import { SubmitCustomerProfileCommand } from './submit-customer-profile.command';
import { submitCustomerProfileError, SubmitCustomerProfileError } from './submit-customer-profile.errors';

export interface SubmitCustomerProfileResult {
  id: string;
}

export type SubmitCustomerProfileServiceResult = Result<SubmitCustomerProfileResult, SubmitCustomerProfileError>;

@CommandHandler(SubmitCustomerProfileCommand)
export class SubmitCustomerProfileHandler implements ICommandHandler<
  SubmitCustomerProfileCommand,
  SubmitCustomerProfileServiceResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: SubmitCustomerProfileCommand): Promise<SubmitCustomerProfileServiceResult> {
    const context = {
      useCase: 'SubmitCustomerProfile',
      tenantId: command.tenantId,
      customerId: command.customerId,
    };
    const result = await this.prisma.client.$transaction(async (tx) => {
      const customer = await tx.v2RentalCustomer.findFirst({
        where: {
          id: command.customerId,
          tenantId: command.tenantId,
          deletedAt: null,
        },
        select: {
          id: true,
          onboardingStatus: true,
          profile: {
            select: { id: true },
          },
        },
      });

      if (!customer) {
        return err(
          submitCustomerProfileError(
            'tenant_management.rental_customer_not_found',
            `Rental customer "${command.customerId}" was not found.`,
            undefined,
            context,
          ),
        );
      }

      if (customer.onboardingStatus === V2RentalCustomerOnboardingStatus.PENDING) {
        return err(
          submitCustomerProfileError(
            'tenant_management.customer_profile_already_pending',
            'The customer profile has already been submitted and is pending review.',
            undefined,
            context,
          ),
        );
      }

      if (customer.onboardingStatus === V2RentalCustomerOnboardingStatus.APPROVED) {
        return err(
          submitCustomerProfileError(
            'tenant_management.customer_profile_already_approved',
            'The customer profile has already been approved.',
            undefined,
            context,
          ),
        );
      }

      const profileData = {
        fullName: command.profile.fullName,
        phone: command.profile.phone,
        birthDate: localDateToPrismaDate(command.profile.birthDate),
        documentNumber: command.profile.documentNumber,
        identityDocumentPath: command.profile.identityDocumentPath,
        address: command.profile.address,
        city: command.profile.city,
        stateRegion: command.profile.stateRegion,
        country: command.profile.country,
        occupation: command.profile.occupation,
        company: command.profile.company ?? null,
        taxId: command.profile.taxId ?? null,
        businessName: command.profile.businessName ?? null,
        instagram: command.profile.instagram ?? null,
        knowsExistingCustomer: command.profile.knowsExistingCustomer ?? false,
        knownCustomerName: command.profile.knownCustomerName ?? null,
        contact1Name: command.profile.contact1Name,
        contact1Phone: command.profile.contact1Phone,
        contact1Relationship: command.profile.contact1Relationship,
        contact2Name: command.profile.contact2Name,
        contact2Phone: command.profile.contact2Phone,
        contact2Relationship: command.profile.contact2Relationship,
        rejectionReason: null,
        reviewedAt: null,
        reviewedById: null,
      };

      const profile = customer.profile
        ? await tx.v2CustomerProfile.update({
            where: { id: customer.profile.id },
            data: profileData,
            select: { id: true },
          })
        : await tx.v2CustomerProfile.create({
            data: {
              customerId: customer.id,
              ...profileData,
            },
            select: { id: true },
          });

      await tx.v2RentalCustomer.update({
        where: { id: customer.id },
        data: { onboardingStatus: V2RentalCustomerOnboardingStatus.PENDING },
      });

      return ok({ id: profile.id });
    });

    return result;
  }
}
