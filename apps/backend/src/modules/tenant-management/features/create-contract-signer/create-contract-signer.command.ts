export class CreateContractSignerCommand {
  public readonly tenantId: string;
  public readonly fullName: string;
  public readonly documentNumber: string;
  public readonly phone: string | null;
  public readonly address: string | null;
  public readonly signatureUrl: string | null;

  constructor(props: {
    tenantId: string;
    fullName: string;
    documentNumber: string;
    phone: string | null;
    address: string | null;
    signatureUrl: string | null;
  }) {
    this.tenantId = props.tenantId;
    this.fullName = props.fullName;
    this.documentNumber = props.documentNumber;
    this.phone = props.phone;
    this.address = props.address;
    this.signatureUrl = props.signatureUrl;
  }
}
