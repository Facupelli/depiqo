import { Body, Controller, HttpCode, HttpStatus, Put } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { UpdateTenantBrandingCommand } from './update-tenant-branding.command';
import { UpdateTenantBrandingError, UpdateTenantBrandingErrorCode } from './update-tenant-branding.errors';
import { UpdateTenantBrandingResult } from './update-tenant-branding.handler';
import { UpdateTenantBrandingRequestDto } from './update-tenant-branding.request.dto';
import { UpdateTenantBrandingResponseDto } from './update-tenant-branding.response.dto';

@Controller('tenant-management/tenant/branding')
export class UpdateTenantBrandingHttpController {
  constructor(private readonly commandBus: CommandBus) {}

  @Put()
  @HttpCode(HttpStatus.OK)
  async updateTenantBranding(
    @Body() dto: UpdateTenantBrandingRequestDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateTenantBrandingResponseDto> {
    const result = await this.commandBus.execute<
      UpdateTenantBrandingCommand,
      Result<UpdateTenantBrandingResult, UpdateTenantBrandingError>
    >(
      new UpdateTenantBrandingCommand({
        tenantId: user.tenantId,
        logoUrl: dto.logoUrl,
        faviconUrl: dto.faviconUrl,
        primaryColor: dto.primaryColor,
        accentColor: dto.accentColor,
        storefrontName: dto.storefrontName,
        tagline: dto.tagline,
      }),
    );

    if (result.isErr()) {
      throw toUpdateTenantBrandingProblem(result.error);
    }

    return result.value;
  }
}

function toUpdateTenantBrandingProblem(error: UpdateTenantBrandingError): ProblemException {
  const problem = updateTenantBrandingProblemMap[error.code];

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

const updateTenantBrandingProblemMap = {
  'tenant_management.tenant_not_found': {
    type: createProblemType('tenant-management/tenant-not-found'),
    title: 'Tenant not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The current tenant could not be found.',
  },
} satisfies Record<UpdateTenantBrandingErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
