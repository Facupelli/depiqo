import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { UpdateContractSignerApplicationError } from './update-contract-signer-application.error';
import { UpdateContractSignerCommand } from './update-contract-signer.command';
import { toUpdateContractSignerProblem } from './update-contract-signer-http-error.mapper';
import { UpdateContractSignerResult } from './update-contract-signer.handler';
import { UpdateContractSignerRequestDto } from './update-contract-signer.request.dto';
import { UpdateContractSignerResponseDto } from './update-contract-signer.response.dto';

@Controller('v2/tenant-management/tenant/contract-signer')
export class UpdateContractSignerHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  async updateContractSigner(
    @Body() dto: UpdateContractSignerRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateContractSignerResponseDto> {
    const result = await this.commandBus.execute<
      UpdateContractSignerCommand,
      Result<UpdateContractSignerResult, UpdateContractSignerApplicationError>
    >(
      new UpdateContractSignerCommand({
        tenantId: user.tenantId,
        fullName: dto.fullName,
        documentNumber: dto.documentNumber,
        phone: dto.phone,
        address: dto.address,
        signatureUrl: dto.signatureUrl,
      }),
    );

    if (result.isErr()) {
      throw toUpdateContractSignerProblem(result.error);
    }

    return result.value;
  }
}
