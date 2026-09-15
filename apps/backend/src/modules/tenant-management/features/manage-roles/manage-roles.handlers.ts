import type { TenantPermission, TenantPermissionMetadataDto, TenantRoleDto } from '@repo/api-contracts';
import { CommandHandler, ICommandHandler, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { err, ok, type Result } from 'neverthrow';

import { PrismaService } from 'src/core/database/prisma.service';
import { Prisma } from 'src/generated/prisma/client';
import { V2TenantSystemRole } from 'src/generated/prisma/enums';

import { TenantAuthorization } from '../../authorization/tenant-authorization.public-api';
import {
  ALL_TENANT_PERMISSIONS,
  parseTenantPermission,
  TENANT_PERMISSION_REGISTRY,
} from '../../authorization/tenant-permission.registry';
import { ManageTenantRolesError, manageTenantRolesError } from './manage-roles.errors';
import {
  CreateTenantRoleCommand,
  DeleteTenantRoleCommand,
  GetTenantPermissionCatalogQuery,
  GetTenantRoleQuery,
  GetTenantRolesQuery,
  UpdateTenantRoleCommand,
} from './manage-roles.messages';

type RoleResult = Result<TenantRoleDto, ManageTenantRolesError>;

type RoleRecord = {
  id: string;
  name: string;
  systemRole: V2TenantSystemRole | null;
  permissions: { permission: string }[];
  _count: { tenantUsers: number };
};

const roleSelect = {
  id: true,
  name: true,
  systemRole: true,
  permissions: { select: { permission: true } },
  _count: { select: { tenantUsers: true } },
} as const;

@QueryHandler(GetTenantRolesQuery)
export class GetTenantRolesHandler implements IQueryHandler<
  GetTenantRolesQuery,
  Result<TenantRoleDto[], ManageTenantRolesError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTenantRolesQuery): Promise<Result<TenantRoleDto[], ManageTenantRolesError>> {
    const roles = await this.prisma.client.v2TenantRole.findMany({
      where: { tenantId: query.tenantId },
      select: roleSelect,
      orderBy: [{ systemRole: 'asc' }, { name: 'asc' }],
    });

    const roleDtos: TenantRoleDto[] = [];
    for (const role of roles) {
      const roleDto = toRoleDto(role, query.tenantId, 'GetTenantRoles');
      if (roleDto.isErr()) return err(roleDto.error);
      roleDtos.push(roleDto.value);
    }
    return ok(roleDtos);
  }
}

@QueryHandler(GetTenantRoleQuery)
export class GetTenantRoleHandler implements IQueryHandler<GetTenantRoleQuery, RoleResult> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetTenantRoleQuery): Promise<RoleResult> {
    const role = await this.prisma.client.v2TenantRole.findFirst({
      where: { id: query.roleId, tenantId: query.tenantId },
      select: roleSelect,
    });

    if (!role) {
      return err(roleNotFound(query.tenantId, query.roleId, 'GetTenantRole'));
    }

    return toRoleDto(role, query.tenantId, 'GetTenantRole');
  }
}

@QueryHandler(GetTenantPermissionCatalogQuery)
export class GetTenantPermissionCatalogHandler implements IQueryHandler<
  GetTenantPermissionCatalogQuery,
  TenantPermissionMetadataDto[]
> {
  async execute(): Promise<TenantPermissionMetadataDto[]> {
    return TENANT_PERMISSION_REGISTRY.map(({ id, group, label, description }) => ({ id, group, label, description }));
  }
}

@CommandHandler(CreateTenantRoleCommand)
export class CreateTenantRoleHandler implements ICommandHandler<CreateTenantRoleCommand, RoleResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: TenantAuthorization,
  ) {}

  async execute(command: CreateTenantRoleCommand): Promise<RoleResult> {
    const permissions = orderedUniquePermissions(command.permissions);
    const authorizationError = await enforcePermissionSubset(
      this.authorization,
      command.tenantId,
      command.actorTenantUserId,
      permissions,
      'CreateTenantRole',
    );
    if (authorizationError) return err(authorizationError);

    try {
      const role = await this.prisma.client.v2TenantRole.create({
        data: {
          tenantId: command.tenantId,
          name: command.name.trim(),
          systemRole: null,
          permissions: { create: permissions.map((permission) => ({ permission })) },
        },
        select: roleSelect,
      });

      return toRoleDto(role, command.tenantId, 'CreateTenantRole');
    } catch (error) {
      if (isUniqueConflict(error)) {
        return err(duplicateName(command.tenantId, command.name, error, 'CreateTenantRole'));
      }
      throw error;
    }
  }
}

@CommandHandler(UpdateTenantRoleCommand)
export class UpdateTenantRoleHandler implements ICommandHandler<UpdateTenantRoleCommand, RoleResult> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: TenantAuthorization,
  ) {}

  async execute(command: UpdateTenantRoleCommand): Promise<RoleResult> {
    const permissions = orderedUniquePermissions(command.permissions);

    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const existing = await tx.v2TenantRole.findFirst({
          where: { id: command.roleId, tenantId: command.tenantId },
          select: { systemRole: true },
        });
        if (!existing) return err(roleNotFound(command.tenantId, command.roleId, 'UpdateTenantRole'));
        if (existing.systemRole === V2TenantSystemRole.ADMIN) {
          return err(
            manageTenantRolesError(
              'tenant_management.system_role_cannot_be_edited',
              'The Administrator system role cannot be edited.',
              undefined,
              { useCase: 'UpdateTenantRole', tenantId: command.tenantId, roleId: command.roleId },
            ),
          );
        }

        const authorizationError = await enforcePermissionSubset(
          this.authorization,
          command.tenantId,
          command.actorTenantUserId,
          permissions,
          'UpdateTenantRole',
        );
        if (authorizationError) return err(authorizationError);

        const role = await tx.v2TenantRole.update({
          where: { tenantId_id: { tenantId: command.tenantId, id: command.roleId } },
          data: {
            name: command.name.trim(),
            permissions: {
              deleteMany: {},
              create: permissions.map((permission) => ({ permission })),
            },
          },
          select: roleSelect,
        });
        return toRoleDto(role, command.tenantId, 'UpdateTenantRole');
      });
    } catch (error) {
      if (isUniqueConflict(error)) {
        return err(duplicateName(command.tenantId, command.name, error, 'UpdateTenantRole'));
      }
      throw error;
    }
  }
}

@CommandHandler(DeleteTenantRoleCommand)
export class DeleteTenantRoleHandler implements ICommandHandler<
  DeleteTenantRoleCommand,
  Result<{ id: string }, ManageTenantRolesError>
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(command: DeleteTenantRoleCommand): Promise<Result<{ id: string }, ManageTenantRolesError>> {
    try {
      return await this.prisma.client.$transaction(async (tx) => {
        const role = await tx.v2TenantRole.findFirst({
          where: { id: command.roleId, tenantId: command.tenantId },
          select: { systemRole: true, _count: { select: { tenantUsers: true } } },
        });
        if (!role) return err(roleNotFound(command.tenantId, command.roleId, 'DeleteTenantRole'));
        if (role.systemRole === V2TenantSystemRole.ADMIN) {
          return err(
            manageTenantRolesError(
              'tenant_management.system_role_cannot_be_deleted',
              'The Administrator system role cannot be deleted.',
              undefined,
              { useCase: 'DeleteTenantRole', tenantId: command.tenantId, roleId: command.roleId },
            ),
          );
        }
        if (role._count.tenantUsers > 0) return err(roleInUse(command.tenantId, command.roleId));

        await tx.v2TenantRole.delete({
          where: { tenantId_id: { tenantId: command.tenantId, id: command.roleId } },
        });
        return ok({ id: command.roleId });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        return err(roleInUse(command.tenantId, command.roleId, error));
      }
      throw error;
    }
  }
}

function toRoleDto(role: RoleRecord, tenantId: string, useCase: string): RoleResult {
  const assignedUserCount = role._count.tenantUsers;
  let permissions: TenantPermission[];

  if (role.systemRole === V2TenantSystemRole.ADMIN) {
    permissions = [...ALL_TENANT_PERMISSIONS];
  } else {
    try {
      const persisted = new Set(role.permissions.map(({ permission }) => parseTenantPermission(permission)));
      permissions = ALL_TENANT_PERMISSIONS.filter((permission) => persisted.has(permission));
    } catch (cause) {
      return err(
        manageTenantRolesError(
          'tenant_management.role_authorization_state_invalid',
          `Tenant role "${role.id}" contains an unknown permission identifier.`,
          cause,
          { useCase, tenantId, roleId: role.id },
        ),
      );
    }
  }

  return ok({
    id: role.id,
    name: role.name,
    systemRole: role.systemRole,
    isSystem: role.systemRole !== null,
    permissions,
    assignedUserCount,
    isInUse: assignedUserCount > 0,
  });
}

function orderedUniquePermissions(permissions: readonly TenantPermission[]): TenantPermission[] {
  const requested = new Set(permissions);
  return ALL_TENANT_PERMISSIONS.filter((permission) => requested.has(permission));
}

async function enforcePermissionSubset(
  authorization: TenantAuthorization,
  tenantId: string,
  actorTenantUserId: string,
  requestedPermissions: readonly TenantPermission[],
  useCase: string,
): Promise<ManageTenantRolesError | null> {
  const result = await authorization.getEffectivePermissions({ tenantId, tenantUserId: actorTenantUserId });
  const context = { useCase, tenantId, actorTenantUserId };

  if (result.isErr()) {
    if (result.error.code === 'TenantAuthorizationSubjectNotFound') {
      return manageTenantRolesError(
        'tenant_management.role_authorization_subject_not_found',
        'The actor authorization subject no longer exists.',
        result.error,
        context,
      );
    }

    return manageTenantRolesError(
      'tenant_management.role_authorization_state_invalid',
      'The actor authorization state could not be evaluated.',
      result.error,
      context,
    );
  }
  if (result.value.systemRole === V2TenantSystemRole.ADMIN) return null;

  const effective = new Set(result.value.permissions);
  if (requestedPermissions.some((permission) => !effective.has(permission))) {
    return manageTenantRolesError(
      'tenant_management.role_permission_escalation_forbidden',
      'A custom role cannot contain permissions the actor does not have.',
      undefined,
      context,
    );
  }
  return null;
}

function roleNotFound(tenantId: string, roleId: string, useCase: string): ManageTenantRolesError {
  return manageTenantRolesError('tenant_management.role_not_found', `Role "${roleId}" was not found.`, undefined, {
    useCase,
    tenantId,
    roleId,
  });
}

function duplicateName(tenantId: string, name: string, cause: unknown, useCase: string): ManageTenantRolesError {
  return manageTenantRolesError(
    'tenant_management.role_name_already_in_use',
    'A tenant role with the requested name already exists.',
    cause,
    { useCase, tenantId, roleName: name.trim() },
  );
}

function roleInUse(tenantId: string, roleId: string, cause?: unknown): ManageTenantRolesError {
  return manageTenantRolesError(
    'tenant_management.role_in_use',
    'The tenant role is assigned to one or more users.',
    cause,
    { useCase: 'DeleteTenantRole', tenantId, roleId },
  );
}

function isUniqueConflict(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
