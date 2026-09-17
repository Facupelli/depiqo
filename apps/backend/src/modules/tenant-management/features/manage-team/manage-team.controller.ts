import type {
  CreateTenantCollaboratorResponseDto as CreateResult,
  ResetTenantCollaboratorPasswordResponseDto as ResetResult,
  TenantCollaboratorDto,
} from '@repo/api-contracts';
import { TenantPermission } from '@repo/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import type { Result } from 'neverthrow';

import { createProblemDetails, createProblemType, ProblemException } from 'src/core/problem-details';

import type { AuthUser } from '../../auth/shared/auth.types';
import { CurrentUser } from '../../auth/shared/current-user/current-user.decorator';
import { RequireAnyPermission, RequirePermission } from '../../authorization/tenant-authorization.decorators';
import {
  ChangeTenantCollaboratorRoleBodyDto,
  ChangeTenantCollaboratorRoleResponseDto,
  CreateTenantCollaboratorBodyDto,
  CreateTenantCollaboratorResponseDto,
  GetTenantCollaboratorResponseDto,
  GetTenantCollaboratorsResponseDto,
  ReactivateTenantCollaboratorResponseDto,
  ResetTenantCollaboratorPasswordResponseDto,
  SuspendTenantCollaboratorResponseDto,
  TenantCollaboratorParamsDto,
} from './manage-team.dto';
import { ManageTenantTeamError, ManageTenantTeamErrorCode } from './manage-team.errors';
import {
  ChangeTenantCollaboratorRoleCommand,
  CreateTenantCollaboratorCommand,
  GetTenantCollaboratorQuery,
  GetTenantCollaboratorsQuery,
  ReactivateTenantCollaboratorCommand,
  ResetTenantCollaboratorPasswordCommand,
  SuspendTenantCollaboratorCommand,
} from './manage-team.messages';

@Controller('tenant-management/team')
export class ManageTenantTeamHttpController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @RequireAnyPermission(TenantPermission.TeamRead, TenantPermission.TeamManage)
  async list(@CurrentUser() user: AuthUser): Promise<GetTenantCollaboratorsResponseDto> {
    const result = await this.queryBus.execute<
      GetTenantCollaboratorsQuery,
      Result<TenantCollaboratorDto[], ManageTenantTeamError>
    >(new GetTenantCollaboratorsQuery(user.tenantId));
    return unwrap(result);
  }

  @Get(':tenantUserId')
  @RequireAnyPermission(TenantPermission.TeamRead, TenantPermission.TeamManage)
  async detail(
    @Param() params: TenantCollaboratorParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<GetTenantCollaboratorResponseDto> {
    const result = await this.queryBus.execute<
      GetTenantCollaboratorQuery,
      Result<TenantCollaboratorDto, ManageTenantTeamError>
    >(new GetTenantCollaboratorQuery(user.tenantId, params.tenantUserId));
    return unwrap(result);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission(TenantPermission.TeamManage)
  async create(
    @Body() body: CreateTenantCollaboratorBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<CreateTenantCollaboratorResponseDto> {
    const result = await this.commandBus.execute<
      CreateTenantCollaboratorCommand,
      Result<CreateResult, ManageTenantTeamError>
    >(
      new CreateTenantCollaboratorCommand({
        tenantId: user.tenantId,
        actorTenantUserId: user.id,
        email: body.email,
        roleId: body.roleId,
      }),
    );
    return unwrap(result);
  }

  @Put(':tenantUserId/role')
  @RequirePermission(TenantPermission.TeamManage)
  async changeRole(
    @Param() params: TenantCollaboratorParamsDto,
    @Body() body: ChangeTenantCollaboratorRoleBodyDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ChangeTenantCollaboratorRoleResponseDto> {
    const result = await this.commandBus.execute<
      ChangeTenantCollaboratorRoleCommand,
      Result<TenantCollaboratorDto, ManageTenantTeamError>
    >(
      new ChangeTenantCollaboratorRoleCommand({
        tenantId: user.tenantId,
        actorTenantUserId: user.id,
        tenantUserId: params.tenantUserId,
        roleId: body.roleId,
      }),
    );
    return unwrap(result);
  }

  @Post(':tenantUserId/suspend')
  @RequirePermission(TenantPermission.TeamManage)
  async suspend(
    @Param() params: TenantCollaboratorParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<SuspendTenantCollaboratorResponseDto> {
    return this.executeLifecycle(new SuspendTenantCollaboratorCommand(user.tenantId, user.id, params.tenantUserId));
  }

  @Post(':tenantUserId/reactivate')
  @RequirePermission(TenantPermission.TeamManage)
  async reactivate(
    @Param() params: TenantCollaboratorParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReactivateTenantCollaboratorResponseDto> {
    return this.executeLifecycle(new ReactivateTenantCollaboratorCommand(user.tenantId, user.id, params.tenantUserId));
  }

  @Post(':tenantUserId/reset-password')
  @RequirePermission(TenantPermission.TeamManage)
  async resetPassword(
    @Param() params: TenantCollaboratorParamsDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ResetTenantCollaboratorPasswordResponseDto> {
    const result = await this.commandBus.execute<
      ResetTenantCollaboratorPasswordCommand,
      Result<ResetResult, ManageTenantTeamError>
    >(new ResetTenantCollaboratorPasswordCommand(user.tenantId, user.id, params.tenantUserId));
    return unwrap(result);
  }

  private async executeLifecycle(
    command: SuspendTenantCollaboratorCommand | ReactivateTenantCollaboratorCommand,
  ): Promise<TenantCollaboratorDto> {
    const result = await this.commandBus.execute<
      SuspendTenantCollaboratorCommand | ReactivateTenantCollaboratorCommand,
      Result<TenantCollaboratorDto, ManageTenantTeamError>
    >(command);
    return unwrap(result);
  }
}

function unwrap<T>(result: Result<T, ManageTenantTeamError>): T {
  if (result.isErr()) throw toManageTeamProblem(result.error);
  return result.value;
}

function toManageTeamProblem(error: ManageTenantTeamError): ProblemException {
  const problem = manageTeamProblemMap[error.code];
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

const manageTeamProblemMap = {
  'tenant_management.collaborator_not_found': problem(
    'collaborator-not-found',
    'Collaborator not found',
    HttpStatus.NOT_FOUND,
    'The requested collaborator was not found.',
  ),
  'tenant_management.role_not_found': problem(
    'role-not-found',
    'Role not found',
    HttpStatus.NOT_FOUND,
    'The selected role was not found.',
  ),
  'tenant_management.collaborator_email_already_in_use': problem(
    'collaborator-email-already-in-use',
    'Email already in use',
    HttpStatus.CONFLICT,
    'The requested email is already associated with an account.',
  ),
  'tenant_management.cannot_manage_self': problem(
    'cannot-manage-self',
    'Cannot manage own account',
    HttpStatus.FORBIDDEN,
    'This team operation cannot target the current user.',
  ),
  'tenant_management.collaborator_management_forbidden': problem(
    'collaborator-management-forbidden',
    'Collaborator management forbidden',
    HttpStatus.FORBIDDEN,
    'The current user cannot manage this collaborator.',
  ),
  'tenant_management.role_assignment_forbidden': problem(
    'role-assignment-forbidden',
    'Role assignment forbidden',
    HttpStatus.FORBIDDEN,
    'The selected role cannot be assigned by the current user.',
  ),
  'tenant_management.administrator_role_assignment_forbidden': problem(
    'administrator-role-assignment-forbidden',
    'Administrator role assignment forbidden',
    HttpStatus.FORBIDDEN,
    'Only an Administrator may assign the Administrator role.',
  ),
  'tenant_management.last_active_administrator': problem(
    'last-active-administrator',
    'Last active Administrator',
    HttpStatus.CONFLICT,
    'The tenant must retain at least one active Administrator.',
  ),
  'tenant_management.invalid_collaborator_status_transition': problem(
    'invalid-collaborator-status-transition',
    'Invalid status transition',
    HttpStatus.CONFLICT,
    'The collaborator status transition is not allowed.',
  ),
  'tenant_management.team_authorization_subject_not_found': problem(
    'team-authorization-subject-not-found',
    'Authentication is no longer valid',
    HttpStatus.UNAUTHORIZED,
    'Authentication is no longer valid.',
  ),
  'tenant_management.team_authorization_state_invalid': problem(
    'team-authorization-state-invalid',
    'Authorization state is invalid',
    HttpStatus.INTERNAL_SERVER_ERROR,
    'The authorization state could not be evaluated.',
  ),
} satisfies Record<ManageTenantTeamErrorCode, ReturnType<typeof problem>>;

function problem(path: string, title: string, status: HttpStatus, detail: string) {
  return { type: createProblemType(`tenant-management/${path}`), title, status, detail };
}
