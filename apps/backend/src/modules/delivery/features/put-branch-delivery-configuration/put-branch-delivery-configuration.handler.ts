import type { PutBranchDeliveryConfigurationResponseDto } from '@repo/api-contracts';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { BranchFacts } from '../../../tenant-management/public-api/branch-facts.public-api';
import { BranchDeliveryConfiguration } from '../../domain/branch-delivery-configuration.aggregate';
import { DeliveryDomainError } from '../../domain/errors/delivery.errors';
import { BranchDeliveryConfigurationRepository } from '../../persistence/branch-delivery-configuration.repository';

import { PutBranchDeliveryConfigurationCommand } from './put-branch-delivery-configuration.command';
import {
  PutBranchDeliveryConfigurationError,
  putBranchDeliveryConfigurationError,
} from './put-branch-delivery-configuration.errors';

export type PutBranchDeliveryConfigurationResult = Result<
  PutBranchDeliveryConfigurationResponseDto,
  PutBranchDeliveryConfigurationError
>;

@CommandHandler(PutBranchDeliveryConfigurationCommand)
export class PutBranchDeliveryConfigurationHandler implements ICommandHandler<
  PutBranchDeliveryConfigurationCommand,
  PutBranchDeliveryConfigurationResult
> {
  constructor(
    private readonly configurations: BranchDeliveryConfigurationRepository,
    private readonly branchFacts: BranchFacts,
  ) {}

  async execute(command: PutBranchDeliveryConfigurationCommand): Promise<PutBranchDeliveryConfigurationResult> {
    const context = {
      useCase: 'PutBranchDeliveryConfiguration',
      tenantId: command.tenantId,
      branchId: command.branchId,
    };
    const branch = await this.branchFacts.getBranchFacts({ tenantId: command.tenantId, branchId: command.branchId });

    if (branch.isErr()) {
      if (branch.error.code === 'BranchNotFound') {
        return err(
          putBranchDeliveryConfigurationError(
            'delivery.branch_not_found',
            `Branch "${command.branchId}" was not found.`,
            branch.error,
            context,
          ),
        );
      }

      throw branch.error;
    }

    const existing = await this.configurations.findByTenantAndBranch(command.tenantId, command.branchId);
    const configuration = existing
      ? existing.reconfigure(command.configuration)
      : BranchDeliveryConfiguration.create({
          tenantId: command.tenantId,
          branchId: command.branchId,
          ...command.configuration,
        });

    if (configuration.isErr()) {
      if (configuration.error instanceof DeliveryDomainError) {
        return err(
          putBranchDeliveryConfigurationError(
            'delivery.configuration_invalid',
            configuration.error.message,
            configuration.error,
            context,
          ),
        );
      }

      throw configuration.error;
    }

    await this.configurations.save(configuration.value);

    return ok({
      enabled: configuration.value.enabled,
      currency: configuration.value.currency.value,
      maximumDistanceMeters: configuration.value.maximumDistanceMeters,
      eligibleWeekdays: [...configuration.value.eligibleWeekdays],
      eligibilityStartMinute: configuration.value.eligibilityWindow.startMinute,
      eligibilityEndMinute: configuration.value.eligibilityWindow.endMinute,
      normalServiceStartMinute: configuration.value.normalServiceWindow.startMinute,
      normalServiceEndMinute: configuration.value.normalServiceWindow.endMinute,
      specialHoursSurcharge: configuration.value.specialHoursSurcharge.toString(),
      transportReservationMinutes: configuration.value.transportReservationMinutes,
      distancePriceBands: configuration.value.distancePriceBands.map((band) => ({
        maxDistanceMeters: band.maxDistanceMeters,
        price: band.price.toString(),
      })),
    });
  }
}
