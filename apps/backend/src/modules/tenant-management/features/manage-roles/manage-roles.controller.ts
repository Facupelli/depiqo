import { TenantPermission, type TenantRoleDto } from '@repo/api-contracts';
import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import { RequireAnyPermission, RequirePermission } from '../../authorization/tenant-authorization.decorators';
import type { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import {
  CreateTenantRoleResponseDto,
  DeleteTenantRoleResponseDto,
  GetTenantPermissionCatalogResponseDto,
  GetTenantRoleResponseDto,
  GetTenantRolesResponseDto,
  TenantRoleBodyDto,
  TenantRoleParamsDto,
  UpdateTenantRoleResponseDto,
} from './manage-roles.dto';
import { type ManageTenantRolesError, type ManageTenantRolesErrorCode } from './manage-roles.errors';
import {
  CreateTenantRoleCommand,
  DeleteTenantRoleCommand,
  GetTenantPermissionCatalogQuery,
  GetTenantRoleQuery,
  GetTenantRolesQuery,
  UpdateTenantRoleCommand,
} from './manage-roles.messages';

@Controller('tenant-management/roles')
export class ManageTenantRolesHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequireAnyPermission(TenantPermission.TeamRead, TenantPermission.TeamManage)
  async getRoles(@CurrentUser() user: AuthUser): Promise<GetTenantRolesResponseDto> {
    const result = await this.queryBus.execute<GetTenantRolesQuery, Result<TenantRoleDto[], ManageTenantRolesError>>(
      new GetTenantRolesQuery(user.tenantId),
    );

    if (result.isErr()) throw toManageRolesProblem(result.error);
    return result.value;
  }

  @Get('permissions')
  @RequireAnyPermission(TenantPermission.TeamRead, TenantPermission.TeamManage)
  getPermissionCatalog(): Promise<GetTenantPermissionCatalogResponseDto> {
    return this.queryBus.execute(new GetTenantPermissionCatalogQuery());
  }

  @Get(':roleId')
  @RequireAnyPermission(TenantPermission.TeamRead, TenantPermission.TeamManage)
  async getRole(
    @Param() params: TenantRoleParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetTenantRoleResponseDto> {
    const result = await this.queryBus.execute<GetTenantRoleQuery, Result<TenantRoleDto, ManageTenantRolesError>>(
      new GetTenantRoleQuery(user.tenantId, params.roleId),
    );
    return unwrapRoleResult(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(TenantPermission.TeamManage)
  async createRole(
    @Body() dto: TenantRoleBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateTenantRoleResponseDto> {
    const result = await this.commandBus.execute<
      CreateTenantRoleCommand,
      Result<TenantRoleDto, ManageTenantRolesError>
    >(
      new CreateTenantRoleCommand({
        tenantId: user.tenantId,
        actorTenantUserId: user.id,
        name: dto.name,
        permissions: dto.permissions,
      }),
    );
    return unwrapRoleResult(result);
  }

  @Put(':roleId')
  @RequirePermission(TenantPermission.TeamManage)
  async updateRole(
    @Param() params: TenantRoleParamsDto,
    @Body() dto: TenantRoleBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<UpdateTenantRoleResponseDto> {
    const result = await this.commandBus.execute<
      UpdateTenantRoleCommand,
      Result<TenantRoleDto, ManageTenantRolesError>
    >(
      new UpdateTenantRoleCommand({
        tenantId: user.tenantId,
        actorTenantUserId: user.id,
        roleId: params.roleId,
        name: dto.name,
        permissions: dto.permissions,
      }),
    );
    return unwrapRoleResult(result);
  }

  @Delete(':roleId')
  @RequirePermission(TenantPermission.TeamManage)
  async deleteRole(
    @Param() params: TenantRoleParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<DeleteTenantRoleResponseDto> {
    const result = await this.commandBus.execute<
      DeleteTenantRoleCommand,
      Result<{ id: string }, ManageTenantRolesError>
    >(new DeleteTenantRoleCommand(user.tenantId, params.roleId));

    if (result.isErr()) throw toManageRolesProblem(result.error);
    return result.value;
  }
}

function unwrapRoleResult(result: Result<TenantRoleDto, ManageTenantRolesError>): TenantRoleDto {
  if (result.isErr()) throw toManageRolesProblem(result.error);
  return result.value;
}

function toManageRolesProblem(error: ManageTenantRolesError): ProblemException {
  const problem = manageRolesProblemMap[error.code];
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

const manageRolesProblemMap = {
  'tenant_management.role_not_found': {
    type: createProblemType('tenant-management/role-not-found'),
    title: 'Role not found',
    status: HttpStatus.NOT_FOUND,
    detail: 'The requested role was not found.',
  },
  'tenant_management.role_name_already_in_use': {
    type: createProblemType('tenant-management/role-name-already-in-use'),
    title: 'Role name already in use',
    status: HttpStatus.CONFLICT,
    detail: 'A role with the requested name already exists.',
  },
  'tenant_management.system_role_cannot_be_edited': {
    type: createProblemType('tenant-management/system-role-cannot-be-edited'),
    title: 'System role cannot be edited',
    status: HttpStatus.CONFLICT,
    detail: 'The Administrator system role cannot be edited.',
  },
  'tenant_management.system_role_cannot_be_deleted': {
    type: createProblemType('tenant-management/system-role-cannot-be-deleted'),
    title: 'System role cannot be deleted',
    status: HttpStatus.CONFLICT,
    detail: 'The Administrator system role cannot be deleted.',
  },
  'tenant_management.role_in_use': {
    type: createProblemType('tenant-management/role-in-use'),
    title: 'Role is in use',
    status: HttpStatus.CONFLICT,
    detail: 'The role is assigned to one or more users.',
  },
  'tenant_management.role_permission_escalation_forbidden': {
    type: createProblemType('tenant-management/role-permission-escalation-forbidden'),
    title: 'Permission escalation forbidden',
    status: HttpStatus.FORBIDDEN,
    detail: 'The role cannot contain permissions the current user does not have.',
  },
  'tenant_management.role_authorization_subject_not_found': {
    type: createProblemType('tenant-management/role-authorization-subject-not-found'),
    title: 'Authentication is no longer valid',
    status: HttpStatus.UNAUTHORIZED,
    detail: 'Authentication is no longer valid.',
  },
  'tenant_management.role_authorization_state_invalid': {
    type: createProblemType('tenant-management/role-authorization-state-invalid'),
    title: 'Role authorization state is invalid',
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'The role authorization state could not be evaluated.',
  },
} satisfies Record<ManageTenantRolesErrorCode, { type: string; title: string; status: HttpStatus; detail: string }>;
