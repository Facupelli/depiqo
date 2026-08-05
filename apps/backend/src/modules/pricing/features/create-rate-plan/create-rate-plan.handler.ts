import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { CreateRatePlanOperation } from '../../application/operations/create-rate-plan.operation';
import { CreateRatePlanCommand } from './create-rate-plan.command';
import { CreateRatePlanError, createRatePlanError } from './create-rate-plan.errors';

export interface CreateRatePlanResult {
  id: string;
}

@CommandHandler(CreateRatePlanCommand)
export class CreateRatePlanHandler implements ICommandHandler<
  CreateRatePlanCommand,
  Result<CreateRatePlanResult, CreateRatePlanError>
> {
  constructor(private readonly createRatePlanOperation: CreateRatePlanOperation) {}

  async execute(command: CreateRatePlanCommand): Promise<Result<CreateRatePlanResult, CreateRatePlanError>> {
    const result = await this.createRatePlanOperation.createRatePlan(command);

    if (result.isErr()) {
      const errorCodeByOperationCode = {
        RatePlanNameAlreadyInUse: 'pricing.rate_plan_name_already_in_use',
        InvalidRatePlan: 'pricing.invalid_rate_plan',
      } as const;

      return err(
        createRatePlanError(errorCodeByOperationCode[result.error.code], result.error.message, result.error, {
          useCase: 'CreateRatePlan',
          tenantId: command.tenantId,
        }),
      );
    }

    return ok({ id: result.value.ratePlan.id });
  }
}
