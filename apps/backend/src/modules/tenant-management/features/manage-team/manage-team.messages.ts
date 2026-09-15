export class GetTenantCollaboratorsQuery {
  constructor(readonly tenantId: string) {}
}

export class GetTenantCollaboratorQuery {
  constructor(
    readonly tenantId: string,
    readonly tenantUserId: string,
  ) {}
}

interface TeamCommandInput {
  tenantId: string;
  actorTenantUserId: string;
}

export class CreateTenantCollaboratorCommand {
  readonly tenantId: string;
  readonly actorTenantUserId: string;
  readonly email: string;
  readonly roleId: string;

  constructor(input: TeamCommandInput & { email: string; roleId: string }) {
    this.tenantId = input.tenantId;
    this.actorTenantUserId = input.actorTenantUserId;
    this.email = input.email;
    this.roleId = input.roleId;
  }
}

export class ChangeTenantCollaboratorRoleCommand {
  readonly tenantId: string;
  readonly actorTenantUserId: string;
  readonly tenantUserId: string;
  readonly roleId: string;

  constructor(input: TeamCommandInput & { tenantUserId: string; roleId: string }) {
    this.tenantId = input.tenantId;
    this.actorTenantUserId = input.actorTenantUserId;
    this.tenantUserId = input.tenantUserId;
    this.roleId = input.roleId;
  }
}

export class SuspendTenantCollaboratorCommand {
  constructor(
    readonly tenantId: string,
    readonly actorTenantUserId: string,
    readonly tenantUserId: string,
  ) {}
}

export class ReactivateTenantCollaboratorCommand extends SuspendTenantCollaboratorCommand {}
export class ResetTenantCollaboratorPasswordCommand extends SuspendTenantCollaboratorCommand {}
