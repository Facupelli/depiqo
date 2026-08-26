import { TenantConfigPatch } from '../../domain/value-objects/tenant-config.value-object';

export class UpdateTenantConfigCommand {
  public readonly tenantId: string;
  public readonly patch: TenantConfigPatch;

  constructor(props: { tenantId: string; patch: TenantConfigPatch }) {
    this.tenantId = props.tenantId;
    this.patch = props.patch;
  }
}
