export class CreateOwnerWithContractCommand {
  public readonly tenantId: string;
  public readonly ownerName: string;
  public readonly basis: 'GROSS' | 'NET';
  public readonly ownerShare: string;
  public readonly rentalShare: string;
  public readonly validFrom: Date;
  public readonly validTo: Date | null;

  constructor(props: {
    tenantId: string;
    ownerName: string;
    basis: 'GROSS' | 'NET';
    ownerShare: string;
    rentalShare: string;
    validFrom: Date;
    validTo: Date | null;
  }) {
    this.tenantId = props.tenantId;
    this.ownerName = props.ownerName;
    this.basis = props.basis;
    this.ownerShare = props.ownerShare;
    this.rentalShare = props.rentalShare;
    this.validFrom = props.validFrom;
    this.validTo = props.validTo;
  }
}
