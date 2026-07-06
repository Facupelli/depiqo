import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetContractSignerResponseDto } from '@repo/api-contracts';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { GetContractSignerResult } from './get-contract-signer.handler';
import { GetContractSignerQuery } from './get-contract-signer.query';

@Controller('tenant-management/tenant/contract-signer')
export class GetContractSignerHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getContractSigner(@CurrentUser() user: AuthUser): Promise<GetContractSignerResponseDto> {
    return this.queryBus.execute<GetContractSignerQuery, GetContractSignerResult>(
      new GetContractSignerQuery(user.tenantId),
    );
  }
}
