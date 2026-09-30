import { TenantPermission } from '@repo/api-contracts';
import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';
import { RequirePermission } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';

import { CreateOwnerWithContractCommand } from './create-owner-with-contract.command';
import { CreateOwnerWithContractError } from './create-owner-with-contract.errors';
import { CreateOwnerWithContractResult } from './create-owner-with-contract.handler';
import { CreateOwnerWithContractRequestDto } from './create-owner-with-contract.request.dto';
import { CreateOwnerWithContractResponseDto } from './create-owner-with-contract.response.dto';

@Controller('asset-inventory/owners')
export class CreateOwnerWithContractHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @RequirePermission(TenantPermission.InventoryOwnershipManage)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOwnerWithContractRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateOwnerWithContractResponseDto> {
    const result = await this.commandBus.execute<CreateOwnerWithContractCommand, CreateOwnerWithContractResult>(
      new CreateOwnerWithContractCommand({
        tenantId: user.tenantId,
        ownerName: dto.owner.name,
        basis: dto.contract.basis,
        ownerShare: dto.contract.ownerShare,
        rentalShare: dto.contract.rentalShare,
        validFrom: dto.contract.validFrom,
        validTo: dto.contract.validTo ?? null,
      }),
    );

    if (result.isErr()) throw toProblem(result.error);
    return result.value;
  }
}

function toProblem(error: CreateOwnerWithContractError): ProblemException {
  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: createProblemType(error.code),
      title: 'Invalid owner contract terms',
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      detail: 'The owner contract terms are invalid.',
      extensions: {
        code: error.code,
        'invalid-params': [{ name: error.context.field, reason: error.context.reason }],
      },
    }),
    applicationError: error,
    cause: error.cause,
  });
}
