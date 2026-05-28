import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { CreateContractSignerApplicationError } from './create-contract-signer-application.error';
import { CreateContractSignerCommand } from './create-contract-signer.command';
import { toCreateContractSignerProblem } from './create-contract-signer-http-error.mapper';
import { CreateContractSignerResult } from './create-contract-signer.handler';
import { CreateContractSignerRequestDto } from './create-contract-signer.request.dto';
import { CreateContractSignerResponseDto } from './create-contract-signer.response.dto';

@Controller('v2/tenant-management/tenant/contract-signer')
export class CreateContractSignerHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createContractSigner(
    @Body() dto: CreateContractSignerRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateContractSignerResponseDto> {
    const result = await this.commandBus.execute<
      CreateContractSignerCommand,
      Result<CreateContractSignerResult, CreateContractSignerApplicationError>
    >(
      new CreateContractSignerCommand({
        tenantId: user.tenantId,
        fullName: dto.fullName,
        documentNumber: dto.documentNumber,
        phone: dto.phone,
        address: dto.address,
        signatureUrl: dto.signatureUrl,
      }),
    );

    if (result.isErr()) {
      throw toCreateContractSignerProblem(result.error);
    }

    return result.value;
  }
}
