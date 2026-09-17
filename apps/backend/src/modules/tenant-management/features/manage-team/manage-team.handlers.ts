import type {
  CreateTenantCollaboratorResponseDto,
  ResetTenantCollaboratorPasswordResponseDto,
  TenantCollaboratorDto,
  TenantPermission,
} from '@repo/api-contracts';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { V2TenantSystemRole, V2UserStatus } from 'src/generated/prisma/enums';

import { normalizeEmail } from '../../auth/shared/auth.types';
import { PasswordService } from '../../auth/shared/password/password.service';
import { TemporaryPasswordService } from '../../auth/shared/password/temporary-password.service';
import { ALL_TENANT_PERMISSIONS, parseTenantPermission } from '../../authorization/tenant-permission.registry';
import { ManageTenantTeamError, manageTenantTeamError } from './manage-team.errors';
import {
  ChangeTenantCollaboratorRoleCommand,
  CreateTenantCollaboratorCommand,
  GetTenantCollaboratorQuery,
  GetTenantCollaboratorsQuery,
  ReactivateTenantCollaboratorCommand,
  ResetTenantCollaboratorPasswordCommand,
  SuspendTenantCollaboratorCommand,
} from './manage-team.messages';

const collaboratorSelect = {
  id: true,
  email: true,
  status: true,
  mustChangePassword: true,
  tenantRole: { select: { id: true, name: true, systemRole: true } },
  createdAt: true,
  updatedAt: true,
} as const;

const authorizationRoleSelect = {
  id: true,
  systemRole: true,
  permissions: { select: { permission: true } },
} as const;

type CollaboratorRecord = Prisma.V2TenantUserGetPayload<{ select: typeof collaboratorSelect }>;
type AuthorizationRole = Prisma.V2TenantRoleGetPayload<{ select: typeof authorizationRoleSelect }>;
type ActorAuthorization = { tenantRole: AuthorizationRole | null } | null;
type CollaboratorResult = Result<TenantCollaboratorDto, ManageTenantTeamError>;
type TransactionClient = Pick<PrismaService['client'], 'v2TenantUser' | 'v2TenantRole' | '$queryRaw'>;

@QueryHandler(GetTenantCollaboratorsQuery)
export class GetTenantCollaboratorsHandler implements IQueryHandler<
  GetTenantCollaboratorsQuery,
  Result<TenantCollaboratorDto[], ManageTenantTeamError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTenantCollaboratorsQuery): Promise<Result<TenantCollaboratorDto[], ManageTenantTeamError>> {
    const records = await this.prisma.client.v2TenantUser.findMany({
      where: { tenantId: query.tenantId, status: { not: V2UserStatus.DELETED } },
      select: collaboratorSelect,
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const collaborators: TenantCollaboratorDto[] = [];
    for (const record of records) {
      const result = toCollaboratorDto(record, query.tenantId, 'GetTenantCollaborators');
      if (result.isErr()) return err(result.error);
      collaborators.push(result.value);
    }
    return ok(collaborators);
  }
}

@QueryHandler(GetTenantCollaboratorQuery)
export class GetTenantCollaboratorHandler implements IQueryHandler<GetTenantCollaboratorQuery, CollaboratorResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTenantCollaboratorQuery): Promise<CollaboratorResult> {
    const record = await this.prisma.client.v2TenantUser.findFirst({
      where: { id: query.tenantUserId, tenantId: query.tenantId, status: { not: V2UserStatus.DELETED } },
      select: collaboratorSelect,
    });
    if (!record) return err(collaboratorNotFound(query.tenantId, query.tenantUserId, 'GetTenantCollaborator'));
    return toCollaboratorDto(record, query.tenantId, 'GetTenantCollaborator');
  }
}

@CommandHandler(CreateTenantCollaboratorCommand)
export class CreateTenantCollaboratorHandler implements ICommandHandler<
  CreateTenantCollaboratorCommand,
  Result<CreateTenantCollaboratorResponseDto, ManageTenantTeamError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly temporaryPasswordService: TemporaryPasswordService,
  ) {}

  async execute(
    command: CreateTenantCollaboratorCommand,
  ): Promise<Result<CreateTenantCollaboratorResponseDto, ManageTenantTeamError>> {
    const email = normalizeEmail(command.email);
    const temporaryPassword = this.temporaryPasswordService.generate();
    const password = await this.passwordService.hashPassword(temporaryPassword);

    try {
      const result = await this.prisma.client.$transaction(async (tx) => {
        const targetRole = await tx.v2TenantRole.findFirst({
          where: { id: command.roleId, tenantId: command.tenantId },
          select: authorizationRoleSelect,
        });
        if (!targetRole) return err(roleNotFound(command.tenantId, command.roleId, 'CreateTenantCollaborator'));

        const actor = await loadActorAuthorization(tx, command.tenantId, command.actorTenantUserId);
        const assignmentError = enforceRoleAssignment(actor, command, targetRole, 'CreateTenantCollaborator');
        if (assignmentError) return err(assignmentError);

        const record = await tx.v2TenantUser.create({
          data: {
            tenantId: command.tenantId,
            email,
            roleId: targetRole.id,
            status: V2UserStatus.ACTIVE,
            mustChangePassword: true,
            localCredential: {
              create: { passwordHash: password.hash, passwordAlgorithm: password.algorithm },
            },
          },
          select: collaboratorSelect,
        });
        const collaborator = toCollaboratorDto(record, command.tenantId, 'CreateTenantCollaborator');
        return collaborator.map((value) => ({ collaborator: value, temporaryPassword }));
      });
      return result;
    } catch (cause) {
      if (isUniqueConflict(cause)) {
        return err(
          manageTenantTeamError(
            'tenant_management.collaborator_email_already_in_use',
            'The requested email is already associated with an account.',
            cause,
            { useCase: 'CreateTenantCollaborator', tenantId: command.tenantId },
          ),
        );
      }
      throw cause;
    }
  }
}

@CommandHandler(ChangeTenantCollaboratorRoleCommand)
export class ChangeTenantCollaboratorRoleHandler implements ICommandHandler<
  ChangeTenantCollaboratorRoleCommand,
  CollaboratorResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ChangeTenantCollaboratorRoleCommand): Promise<CollaboratorResult> {
    if (command.actorTenantUserId === command.tenantUserId)
      return err(cannotManageSelf(command, 'ChangeTenantCollaboratorRole'));

    return this.prisma.client.$transaction(async (tx) => {
      await lockTenant(tx, command.tenantId);
      const target = await findLifecycleTarget(tx, command.tenantId, command.tenantUserId);
      if (!target)
        return err(collaboratorNotFound(command.tenantId, command.tenantUserId, 'ChangeTenantCollaboratorRole'));

      const actor = await loadActorAuthorization(tx, command.tenantId, command.actorTenantUserId);
      const managementError = enforceCanManageCollaborator(
        actor,
        command,
        target.tenantRole,
        'ChangeTenantCollaboratorRole',
      );
      if (managementError) return err(managementError);

      const role = await tx.v2TenantRole.findFirst({
        where: { id: command.roleId, tenantId: command.tenantId },
        select: authorizationRoleSelect,
      });
      if (!role) return err(roleNotFound(command.tenantId, command.roleId, 'ChangeTenantCollaboratorRole'));

      const assignmentError = enforceRoleAssignment(actor, command, role, 'ChangeTenantCollaboratorRole');
      if (assignmentError) return err(assignmentError);

      if (
        target.status === V2UserStatus.ACTIVE &&
        target.tenantRole?.systemRole === V2TenantSystemRole.ADMIN &&
        role.systemRole !== V2TenantSystemRole.ADMIN &&
        (await countActiveAdministrators(tx, command.tenantId)) <= 1
      ) {
        return err(lastActiveAdministrator(command, 'ChangeTenantCollaboratorRole'));
      }

      const updated = await tx.v2TenantUser.update({
        where: { id: target.id },
        data: { roleId: role.id, sessionVersion: { increment: 1 } },
        select: collaboratorSelect,
      });
      return toCollaboratorDto(updated, command.tenantId, 'ChangeTenantCollaboratorRole');
    });
  }
}

@CommandHandler(SuspendTenantCollaboratorCommand)
export class SuspendTenantCollaboratorHandler implements ICommandHandler<
  SuspendTenantCollaboratorCommand,
  CollaboratorResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: SuspendTenantCollaboratorCommand): Promise<CollaboratorResult> {
    if (command.actorTenantUserId === command.tenantUserId)
      return err(cannotManageSelf(command, 'SuspendTenantCollaborator'));

    return this.prisma.client.$transaction(async (tx) => {
      await lockTenant(tx, command.tenantId);
      const target = await findLifecycleTarget(tx, command.tenantId, command.tenantUserId);
      if (!target)
        return err(collaboratorNotFound(command.tenantId, command.tenantUserId, 'SuspendTenantCollaborator'));

      const actor = await loadActorAuthorization(tx, command.tenantId, command.actorTenantUserId);
      const managementError = enforceCanManageCollaborator(
        actor,
        command,
        target.tenantRole,
        'SuspendTenantCollaborator',
      );
      if (managementError) return err(managementError);
      if (target.status !== V2UserStatus.ACTIVE) return err(invalidTransition(command, 'SuspendTenantCollaborator'));
      if (
        target.tenantRole?.systemRole === V2TenantSystemRole.ADMIN &&
        (await countActiveAdministrators(tx, command.tenantId)) <= 1
      ) {
        return err(lastActiveAdministrator(command, 'SuspendTenantCollaborator'));
      }

      const updated = await tx.v2TenantUser.update({
        where: { id: target.id },
        data: { status: V2UserStatus.SUSPENDED, sessionVersion: { increment: 1 } },
        select: collaboratorSelect,
      });
      return toCollaboratorDto(updated, command.tenantId, 'SuspendTenantCollaborator');
    });
  }
}

@CommandHandler(ReactivateTenantCollaboratorCommand)
export class ReactivateTenantCollaboratorHandler implements ICommandHandler<
  ReactivateTenantCollaboratorCommand,
  CollaboratorResult
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: ReactivateTenantCollaboratorCommand): Promise<CollaboratorResult> {
    if (command.actorTenantUserId === command.tenantUserId)
      return err(cannotManageSelf(command, 'ReactivateTenantCollaborator'));

    return this.prisma.client.$transaction(async (tx) => {
      const target = await findLifecycleTarget(tx, command.tenantId, command.tenantUserId);
      if (!target)
        return err(collaboratorNotFound(command.tenantId, command.tenantUserId, 'ReactivateTenantCollaborator'));

      const actor = await loadActorAuthorization(tx, command.tenantId, command.actorTenantUserId);
      const managementError = enforceCanManageCollaborator(
        actor,
        command,
        target.tenantRole,
        'ReactivateTenantCollaborator',
      );
      if (managementError) return err(managementError);
      if (target.status !== V2UserStatus.SUSPENDED)
        return err(invalidTransition(command, 'ReactivateTenantCollaborator'));

      const updated = await tx.v2TenantUser.update({
        where: { id: target.id },
        data: { status: V2UserStatus.ACTIVE },
        select: collaboratorSelect,
      });
      return toCollaboratorDto(updated, command.tenantId, 'ReactivateTenantCollaborator');
    });
  }
}

@CommandHandler(ResetTenantCollaboratorPasswordCommand)
export class ResetTenantCollaboratorPasswordHandler implements ICommandHandler<
  ResetTenantCollaboratorPasswordCommand,
  Result<ResetTenantCollaboratorPasswordResponseDto, ManageTenantTeamError>
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly temporaryPasswordService: TemporaryPasswordService,
  ) {}

  async execute(
    command: ResetTenantCollaboratorPasswordCommand,
  ): Promise<Result<ResetTenantCollaboratorPasswordResponseDto, ManageTenantTeamError>> {
    if (command.actorTenantUserId === command.tenantUserId)
      return err(cannotManageSelf(command, 'ResetTenantCollaboratorPassword'));

    return this.prisma.client.$transaction(async (tx) => {
      const target = await findLifecycleTarget(tx, command.tenantId, command.tenantUserId);
      if (!target)
        return err(collaboratorNotFound(command.tenantId, command.tenantUserId, 'ResetTenantCollaboratorPassword'));

      const actor = await loadActorAuthorization(tx, command.tenantId, command.actorTenantUserId);
      const managementError = enforceCanManageCollaborator(
        actor,
        command,
        target.tenantRole,
        'ResetTenantCollaboratorPassword',
      );
      if (managementError) return err(managementError);

      const temporaryPassword = this.temporaryPasswordService.generate();
      const password = await this.passwordService.hashPassword(temporaryPassword);
      const now = new Date();
      const updated = await tx.v2TenantUser.update({
        where: { id: target.id },
        data: {
          mustChangePassword: true,
          passwordChangedAt: now,
          sessionVersion: { increment: 1 },
          localCredential: {
            upsert: {
              create: { passwordHash: password.hash, passwordAlgorithm: password.algorithm, passwordUpdatedAt: now },
              update: { passwordHash: password.hash, passwordAlgorithm: password.algorithm, passwordUpdatedAt: now },
            },
          },
        },
        select: collaboratorSelect,
      });
      const collaborator = toCollaboratorDto(updated, command.tenantId, 'ResetTenantCollaboratorPassword');
      return collaborator.map((value) => ({ collaborator: value, temporaryPassword }));
    });
  }
}

function enforceCanManageCollaborator(
  actor: ActorAuthorization,
  command: { tenantId: string; actorTenantUserId: string; tenantUserId: string },
  targetRole: { systemRole: V2TenantSystemRole | null; permissions: { permission: string }[] } | null,
  useCase: string,
): ManageTenantTeamError | null {
  const context = {
    useCase,
    tenantId: command.tenantId,
    actorTenantUserId: command.actorTenantUserId,
    tenantUserId: command.tenantUserId,
  };
  if (!actor) {
    return manageTenantTeamError(
      'tenant_management.team_authorization_subject_not_found',
      'The actor authorization subject no longer exists.',
      undefined,
      context,
    );
  }
  if (!actor.tenantRole) return invalidAuthorizationState('The actor has no assigned tenant role.', context);
  if (!targetRole) return invalidAuthorizationState('The collaborator has no assigned tenant role.', context);
  if (actor.tenantRole.systemRole === V2TenantSystemRole.ADMIN) return null;

  if (targetRole.systemRole === V2TenantSystemRole.ADMIN) {
    return collaboratorManagementForbidden(context);
  }

  const actorPermissions = parsePermissions(actor.tenantRole.permissions, context);
  if (actorPermissions.isErr()) return actorPermissions.error;
  const targetPermissions = parsePermissions(targetRole.permissions, context);
  if (targetPermissions.isErr()) return targetPermissions.error;

  if (targetPermissions.value.some((permission) => !actorPermissions.value.includes(permission))) {
    return collaboratorManagementForbidden(context);
  }
  return null;
}

function enforceRoleAssignment(
  actor: ActorAuthorization,
  command: { tenantId: string; actorTenantUserId: string },
  targetRole: { id: string; systemRole: V2TenantSystemRole | null; permissions: { permission: string }[] },
  useCase: string,
): ManageTenantTeamError | null {
  const context = {
    useCase,
    tenantId: command.tenantId,
    actorTenantUserId: command.actorTenantUserId,
    roleId: targetRole.id,
  };
  if (!actor) {
    return manageTenantTeamError(
      'tenant_management.team_authorization_subject_not_found',
      'The actor authorization subject no longer exists.',
      undefined,
      context,
    );
  }
  if (!actor.tenantRole) return invalidAuthorizationState('The actor has no assigned tenant role.', context);

  if (targetRole.systemRole === V2TenantSystemRole.ADMIN && actor.tenantRole.systemRole !== V2TenantSystemRole.ADMIN) {
    return manageTenantTeamError(
      'tenant_management.administrator_role_assignment_forbidden',
      'Only an Administrator may assign the Administrator role.',
      undefined,
      context,
    );
  }
  if (actor.tenantRole.systemRole === V2TenantSystemRole.ADMIN) return null;

  const actorPermissions = parsePermissions(actor.tenantRole.permissions, context);
  if (actorPermissions.isErr()) return actorPermissions.error;
  const targetPermissions = parsePermissions(targetRole.permissions, context);
  if (targetPermissions.isErr()) return targetPermissions.error;

  if (targetPermissions.value.some((permission) => !actorPermissions.value.includes(permission))) {
    return manageTenantTeamError(
      'tenant_management.role_assignment_forbidden',
      'The selected role grants permissions the actor does not have.',
      undefined,
      context,
    );
  }
  return null;
}

function loadActorAuthorization(
  tx: TransactionClient,
  tenantId: string,
  actorTenantUserId: string,
): Promise<ActorAuthorization> {
  return tx.v2TenantUser.findFirst({
    where: { id: actorTenantUserId, tenantId },
    select: { tenantRole: { select: authorizationRoleSelect } },
  });
}

function parsePermissions(
  permissions: { permission: string }[],
  context: Record<string, unknown>,
): Result<TenantPermission[], ManageTenantTeamError> {
  try {
    const persisted = new Set(permissions.map(({ permission }) => parseTenantPermission(permission)));
    return ok(ALL_TENANT_PERMISSIONS.filter((permission) => persisted.has(permission)));
  } catch (cause) {
    return err(invalidAuthorizationState('A role contains an unknown permission identifier.', context, cause));
  }
}

function toCollaboratorDto(record: CollaboratorRecord, tenantId: string, useCase: string): CollaboratorResult {
  if (!record.tenantRole) {
    return err(
      invalidAuthorizationState('A collaborator has no assigned tenant role.', {
        useCase,
        tenantId,
        tenantUserId: record.id,
      }),
    );
  }
  if (record.status === V2UserStatus.DELETED) {
    return err(collaboratorNotFound(tenantId, record.id, useCase));
  }
  return ok({
    id: record.id,
    email: record.email,
    status: record.status,
    mustChangePassword: record.mustChangePassword,
    role: record.tenantRole,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  });
}

function findLifecycleTarget(tx: TransactionClient, tenantId: string, tenantUserId: string) {
  return tx.v2TenantUser.findFirst({
    where: { id: tenantUserId, tenantId, status: { not: V2UserStatus.DELETED } },
    select: { id: true, status: true, tenantRole: { select: authorizationRoleSelect } },
  });
}

function countActiveAdministrators(tx: TransactionClient, tenantId: string): Promise<number> {
  return tx.v2TenantUser.count({
    where: { tenantId, status: V2UserStatus.ACTIVE, tenantRole: { systemRole: V2TenantSystemRole.ADMIN } },
  });
}

async function lockTenant(tx: TransactionClient, tenantId: string): Promise<void> {
  await tx.$queryRaw`SELECT id FROM v2_tenants WHERE id = ${tenantId} FOR UPDATE`;
}

function collaboratorManagementForbidden(context: Record<string, unknown>): ManageTenantTeamError {
  return manageTenantTeamError(
    'tenant_management.collaborator_management_forbidden',
    'The actor cannot manage a collaborator with a more privileged role.',
    undefined,
    context,
  );
}

function collaboratorNotFound(tenantId: string, tenantUserId: string, useCase: string): ManageTenantTeamError {
  return manageTenantTeamError(
    'tenant_management.collaborator_not_found',
    'The collaborator was not found.',
    undefined,
    {
      useCase,
      tenantId,
      tenantUserId,
    },
  );
}

function roleNotFound(tenantId: string, roleId: string, useCase: string): ManageTenantTeamError {
  return manageTenantTeamError('tenant_management.role_not_found', 'The selected role was not found.', undefined, {
    useCase,
    tenantId,
    roleId,
  });
}

function cannotManageSelf(
  command: { tenantId: string; actorTenantUserId: string; tenantUserId: string },
  useCase: string,
): ManageTenantTeamError {
  return manageTenantTeamError(
    'tenant_management.cannot_manage_self',
    'Team administration cannot target the current user.',
    undefined,
    {
      useCase,
      tenantId: command.tenantId,
      actorTenantUserId: command.actorTenantUserId,
    },
  );
}

function lastActiveAdministrator(
  command: { tenantId: string; tenantUserId: string },
  useCase: string,
): ManageTenantTeamError {
  return manageTenantTeamError(
    'tenant_management.last_active_administrator',
    'The last active Administrator cannot be suspended or demoted.',
    undefined,
    { useCase, tenantId: command.tenantId, tenantUserId: command.tenantUserId },
  );
}

function invalidTransition(
  command: { tenantId: string; tenantUserId: string },
  useCase: string,
): ManageTenantTeamError {
  return manageTenantTeamError(
    'tenant_management.invalid_collaborator_status_transition',
    'The collaborator status transition is not allowed.',
    undefined,
    { useCase, tenantId: command.tenantId, tenantUserId: command.tenantUserId },
  );
}

function invalidAuthorizationState(
  message: string,
  context: Record<string, unknown>,
  cause?: unknown,
): ManageTenantTeamError {
  return manageTenantTeamError('tenant_management.team_authorization_state_invalid', message, cause, context);
}

function isUniqueConflict(cause: unknown): boolean {
  return cause instanceof Prisma.PrismaClientKnownRequestError && cause.code === 'P2002';
}
