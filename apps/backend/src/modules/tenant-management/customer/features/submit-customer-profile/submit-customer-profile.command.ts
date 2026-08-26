import { SubmitCustomerProfileBodyDto } from '@repo/api-contracts';

export class SubmitCustomerProfileCommand {
  public readonly tenantId: string;
  public readonly customerId: string;
  public readonly profile: SubmitCustomerProfileBodyDto;

  constructor(props: { tenantId: string; customerId: string; profile: SubmitCustomerProfileBodyDto }) {
    this.tenantId = props.tenantId;
    this.customerId = props.customerId;
    this.profile = props.profile;
  }
}
