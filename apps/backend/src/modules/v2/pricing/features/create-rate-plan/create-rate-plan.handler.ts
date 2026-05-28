import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { err, ok, Result } from 'neverthrow';

import { CreateRatePlanOperation } from '../../application/operations/create-rate-plan.operation';
import { CreateRatePlanApplicationError, createRatePlanApplicationError } from './create-rate-plan-application.error';
import { CreateRatePlanCommand } from './create-rate-plan.command';
import { mapCreateRatePlanError } from './map-create-rate-plan-error';

export interface CreateRatePlanResult {
  id: string;
}

@CommandHandler(CreateRatePlanCommand)
export class CreateRatePlanHandler implements ICommandHandler<
  CreateRatePlanCommand,
  Result<CreateRatePlanResult, CreateRatePlanApplicationError>
> {
  constructor(private readonly createRatePlanOperation: CreateRatePlanOperation) {}

  async execute(command: CreateRatePlanCommand): Promise<Result<CreateRatePlanResult, CreateRatePlanApplicationError>> {
    const result = await this.createRatePlanOperation.createRatePlan(command);

    if (result.isErr()) {
      if (result.error.code === 'RatePlanNameAlreadyInUse') {
        return err(createRatePlanApplicationError(result.error.code, result.error.message));
      }

      return err(mapCreateRatePlanError(result.error.cause));
    }

    return ok({ id: result.value.ratePlan.id });
  }
}
