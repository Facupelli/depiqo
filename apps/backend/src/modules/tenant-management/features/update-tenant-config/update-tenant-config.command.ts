import {
  TenantConfigPatch,
  TenantRentalAssetBufferConfigProps,
} from '../../domain/value-objects/tenant-config.value-object';

type UpdateTenantConfigPatch = TenantConfigPatch & {
  rentalAssetBuffer?: Partial<TenantRentalAssetBufferConfigProps>;
};

export class UpdateTenantConfigCommand {
  public readonly tenantId: string;
  public readonly patch: UpdateTenantConfigPatch;

  constructor(props: { tenantId: string; patch: UpdateTenantConfigPatch }) {
    this.tenantId = props.tenantId;
    this.patch = props.patch;
  }
}
