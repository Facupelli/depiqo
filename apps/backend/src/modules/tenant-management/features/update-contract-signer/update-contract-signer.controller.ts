import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { UpdateContractSignerCommand } from './update-contract-signer.command';
import { UpdateContractSignerError, UpdateContractSignerErrorCode } from './update-contract-signer.errors';
import { UpdateContractSignerResult } from './update-contract-signer.handler';
import { UpdateContractSignerRequestDto } from './update-contract-signer.request.dto';
import { UpdateContractSignerResponseDto } from './update-contract-signer.response.dto';

@Controller('tenant-management/tenant/contract-signer')
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
      Result<UpdateContractSignerResult, UpdateContractSignerError>
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

function toUpdateContractSignerProblem(error: UpdateContractSignerError): ProblemException {
  const problem = updateContractSignerProblemMap[error.code];

  return ProblemException.from({
    problemDetails: createProblemDetails({
      type: problem.type,
      title: problem.title,
      status: problem.status,
      detail: problem.detail,
      extensions: { code: error.code },
    }),
    applicationError: error,
    cause: error.cause,
  });
}

const updateContractSignerProblemMap = {
  'tenant_management.contract_signer_not_found': {
    type: createProblemType('tenant-management/contract-signer-not-found'),
    title: 'Contract signer not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant does not have an active contract signer.',
  },
} satisfies Record<UpdateContractSignerErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
