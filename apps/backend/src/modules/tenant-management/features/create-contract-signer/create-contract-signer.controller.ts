import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { CreateContractSignerCommand } from './create-contract-signer.command';
import { CreateContractSignerError, CreateContractSignerErrorCode } from './create-contract-signer.errors';
import { CreateContractSignerResult } from './create-contract-signer.handler';
import { CreateContractSignerRequestDto } from './create-contract-signer.request.dto';
import { CreateContractSignerResponseDto } from './create-contract-signer.response.dto';

@Controller('tenant-management/tenant/contract-signer')
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
      Result<CreateContractSignerResult, CreateContractSignerError>
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

function toCreateContractSignerProblem(error: CreateContractSignerError): ProblemException {
  const problem = createContractSignerProblemMap[error.code];

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

const createContractSignerProblemMap = {
  'tenant_management.contract_signer_already_exists': {
    type: createProblemType('tenant-management/contract-signer-already-exists'),
    title: 'Contract signer already exists',
    status: HttpStatus.CONFLICT,
    detail: 'The current tenant already has an active contract signer.',
  },
} satisfies Record<CreateContractSignerErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
