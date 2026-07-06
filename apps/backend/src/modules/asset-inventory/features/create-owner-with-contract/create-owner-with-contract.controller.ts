import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';

import { CurrentUser } from 'src/core/decorators/current-user.decorator';
import { AuthUser } from 'src/modules/tenant-management/auth/shared/auth.types';

import { CreateOwnerWithContractCommand } from './create-owner-with-contract.command';
import { CreateOwnerWithContractResult } from './create-owner-with-contract.handler';
import { CreateOwnerWithContractRequestDto } from './create-owner-with-contract.request.dto';
import { CreateOwnerWithContractResponseDto } from './create-owner-with-contract.response.dto';

@Controller('v2/asset-inventory/owners')
export class CreateOwnerWithContractHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateOwnerWithContractRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateOwnerWithContractResponseDto> {
    return this.commandBus.execute<CreateOwnerWithContractCommand, CreateOwnerWithContractResult>(
      new CreateOwnerWithContractCommand({
        tenantId: user.tenantId,
        ownerName: dto.owner.name,
        basis: dto.contract.basis,
        ownerShare: dto.contract.ownerShare,
        rentalShare: dto.contract.rentalShare,
        validFrom: new Date(dto.contract.validFrom),
        validTo: dto.contract.validTo ? new Date(dto.contract.validTo) : null,
      }),
    );
  }
}
