import { TenantPermission } from '@repo/api-contracts';
import { Controller, Get, NotFoundException, Param, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { AuthUser } from '../../auth/shared/auth.types';
import { RequireAnyPermission } from '../../authorization/tenant-authorization.decorators';
import { InternalTokenGuard } from '../../tenant-context/guards/internal-token.guard';
import { GetCustomerIdentityDocumentDescriptorParamsDto } from './get-customer-identity-document-descriptor.request.dto';
import { GetCustomerIdentityDocumentDescriptorQuery } from './get-customer-identity-document-descriptor.query';

// Internal-only response: never return this value through a browser-facing contract.
@Controller('internal/tenant-management/rental-customers')
@UseGuards(InternalTokenGuard)
export class GetCustomerIdentityDocumentDescriptorHttpController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get(':customerId/identity-document-descriptor')
  @RequireAnyPermission(TenantPermission.CustomersOnboardingManage, TenantPermission.CustomersIdentityDocumentRead)
  async getDescriptor(
    @Param() params: GetCustomerIdentityDocumentDescriptorParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<{ objectPath: string }> {
    const objectPath = await this.queryBus.execute<GetCustomerIdentityDocumentDescriptorQuery, string | null>(
      new GetCustomerIdentityDocumentDescriptorQuery(user.tenantId, params.customerId),
    );
    if (!objectPath) throw new NotFoundException('Identity document unavailable');
    return { objectPath };
  }
}
