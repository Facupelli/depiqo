import { Controller, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ChangeEquipmentTypeLifecycleParamsSchema } from '@repo/api-contracts';
import { createZodDto } from 'nestjs-zod';
import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { ReactivateEquipmentTypeCommand } from './reactivate-equipment-type.command';
import { ReactivateEquipmentTypeError } from './reactivate-equipment-type.errors';
import { ReactivateEquipmentTypeResult } from './reactivate-equipment-type.handler';
class ParamsDto extends createZodDto(ChangeEquipmentTypeLifecycleParamsSchema) {}
@Controller('asset-inventory/equipment-types')
export class ReactivateEquipmentTypeHttpController {
  constructor(private readonly commandBus: CommandBus) {}
  @Post(':equipmentTypeId/reactivate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async reactivate(@Param() params: ParamsDto, @CurrentUser() user: AuthUser): Promise<void> {
    const result = await this.commandBus.execute<ReactivateEquipmentTypeCommand, ReactivateEquipmentTypeResult>(
      new ReactivateEquipmentTypeCommand(user.tenantId, params.equipmentTypeId),
    );
    if (result.isErr()) throw notFound(result.error);
  }
}
function notFound(error: ReactivateEquipmentTypeError): ProblemException {
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
