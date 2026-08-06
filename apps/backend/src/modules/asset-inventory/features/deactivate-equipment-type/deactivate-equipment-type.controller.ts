import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ChangeEquipmentTypeLifecycleParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { DeactivateEquipmentTypeCommand } from './deactivate-equipment-type.command';
import { DeactivateEquipmentTypeError } from './deactivate-equipment-type.errors';
import { DeactivateEquipmentTypeResult } from './deactivate-equipment-type.handler';
class ParamsDto extends createZodDto(ChangeEquipmentTypeLifecycleParamsSchema) {}
@Controller('asset-inventory/equipment-types')
export class DeactivateEquipmentTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}
  @Post(':equipmentTypeId/deactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param() params: ParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<DeactivateEquipmentTypeCommand, DeactivateEquipmentTypeResult>(
      new DeactivateEquipmentTypeCommand(user.tenantId, params.equipmentTypeId),
    );
    if (result.isErr()) throw notFound(result.error);
  }
}
function notFound(error: DeactivateEquipmentTypeError): ProblemException {
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(error.code),
      title: 'Equipment type not found',
      status: HttpStatus.NOT_FOUND,
      detail: 'The requested equipment type could not be found.',
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}
