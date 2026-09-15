import type { TenantPermission } from '@repo/api-contracts';

export class GetTenantRolesQuery {
  constructor(readonly tenantId: string) {}
}

export class GetTenantRoleQuery {
  constructor(
    readonly tenantId: string,
    readonly roleId: string,
  ) {}
}

export class GetTenantPermissionCatalogQuery {}

interface RoleMutationInput {
  tenantId: string;
  actorTenantUserId: string;
  name: string;
  permissions: readonly TenantPermission[];
}

export class CreateTenantRoleCommand {
  readonly tenantId: string;
  readonly actorTenantUserId: string;
  readonly name: string;
  readonly permissions: readonly TenantPermission[];

  constructor(input: RoleMutationInput) {
    this.tenantId = input.tenantId;
    this.actorTenantUserId = input.actorTenantUserId;
    this.name = input.name;
    this.permissions = input.permissions;
  }
}

export class UpdateTenantRoleCommand extends CreateTenantRoleCommand {
  readonly roleId: string;

  constructor(input: RoleMutationInput & { roleId: string }) {
    super(input);
    this.roleId = input.roleId;
  }
}

export class DeleteTenantRoleCommand {
  constructor(
    readonly tenantId: string,
    readonly roleId: string,
  ) {}
}
