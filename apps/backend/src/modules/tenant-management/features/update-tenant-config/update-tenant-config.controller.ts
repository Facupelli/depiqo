import { Body, Controller, HttpCode, HttpStatus, Patch } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { TenantPermission, type TenantPermission as TenantPermissionId } from '@repo/api-contracts';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';
import { ConditionalAuthorization } from 'src/modules/tenant-management/authorization/tenant-authorization.decorators';
import { TenantAuthorizationHttpEnforcer } from 'src/modules/tenant-management/authorization/tenant-authorization-http.enforcer';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { UpdateTenantConfigCommand } from './update-tenant-config.command';
import { UpdateTenantConfigError, UpdateTenantConfigErrorCode } from './update-tenant-config.errors';
import { UpdateTenantConfigResult } from './update-tenant-config.handler';
import { UpdateTenantConfigRequestDto } from './update-tenant-config.request.dto';
import { UpdateTenantConfigResponseDto } from './update-tenant-config.response.dto';

@Controller('tenant-management/tenant/config')
export class UpdateTenantConfigHttpController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly authorizationEnforcer: TenantAuthorizationHttpEnforcer,
  ) {}

  @Patch()
  @HttpCode(HttpStatus.OK)
  @ConditionalAuthorization()
  async updateTenantConfig(
    @Body() dto: UpdateTenantConfigRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateTenantConfigResponseDto> {
    const [firstRequiredPermission, ...additionalRequiredPermissions] = requiredTenantConfigPermissions(dto);
    if (firstRequiredPermission !== undefined) {
      await this.authorizationEnforcer.requireAllPermissions(user, [
        firstRequiredPermission,
        ...additionalRequiredPermissions,
      ]);
    }

    const result = await this.commandBus.execute<
      UpdateTenantConfigCommand,
      Result<UpdateTenantConfigResult, UpdateTenantConfigError>
    >(
      new UpdateTenantConfigCommand({
        tenantId: user.tenantId,
        patch: dto,
      }),
    );

    if (result.isErr()) {
      throw toUpdateTenantConfigProblem(result.error);
    }

    return result.value;
  }
}

function requiredTenantConfigPermissions(dto: UpdateTenantConfigRequestDto): TenantPermissionId[] {
  const permissions: TenantPermissionId[] = [];
  const require = (permission: TenantPermissionId): void => {
    if (!permissions.includes(permission)) permissions.push(permission);
  };

  if (
    'timezone' in dto ||
    (dto.notifications !== undefined && 'enabledChannels' in dto.notifications) ||
    (dto.communication !== undefined &&
      ('orderCommunicationMode' in dto.communication || 'whatsAppNumber' in dto.communication)) ||
    (dto.rentalAssetBuffer !== undefined &&
      ('beforeBufferMinutes' in dto.rentalAssetBuffer || 'afterBufferMinutes' in dto.rentalAssetBuffer))
  ) {
    require(TenantPermission.TenantSettingsManage);
  }

  if (
    'bookingMode' in dto ||
    'newArrivalsWindowDays' in dto ||
    (dto.communication !== undefined && 'showFloatingWhatsAppButton' in dto.communication)
  ) {
    require(TenantPermission.TenantStorefrontManage);
  }

  if (dto.pricing !== undefined && Object.keys(dto.pricing).length > 0) {
    require(TenantPermission.PricingManage);
  }

  return permissions;
}

function toUpdateTenantConfigProblem(error: UpdateTenantConfigError): ProblemException {
  const problem = updateTenantConfigProblemMap[error.code];

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

const updateTenantConfigProblemMap = {
  'tenant_management.tenant_not_found': {
    type: createProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant could not be found.',
  },
  'tenant_management.invalid_tenant_config': {
    type: createProblemType('tenant-management/invalid-tenant-config'),
    title: 'Invalid tenant config',
    status: HttpStatus.UNPROCESSABLE_ENTITY,
    detail: 'The tenant config update contains invalid values.',
  },
} satisfies Record<UpdateTenantConfigErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
