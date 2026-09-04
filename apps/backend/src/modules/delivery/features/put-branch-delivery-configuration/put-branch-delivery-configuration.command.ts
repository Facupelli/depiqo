import type { BranchDeliveryConfigurationInput } from '../../domain/branch-delivery-configuration.aggregate';

export class PutBranchDeliveryConfigurationCommand {
  public readonly tenantId: string;
  public readonly branchId: string;
  public readonly configuration: BranchDeliveryConfigurationInput;

  constructor(props: { tenantId: string; branchId: string; configuration: BranchDeliveryConfigurationInput }) {
    this.tenantId = props.tenantId;
    this.branchId = props.branchId;
    this.configuration = props.configuration;
  }
}
