export class CreateCategoryCommand {
  public readonly tenantId: string;
  public readonly name: string;
  public readonly slug?: string;
  public readonly sortOrder: number;
  public readonly isActive: boolean;

  constructor(props: { tenantId: string; name: string; slug?: string; sortOrder: number; isActive: boolean }) {
    this.tenantId = props.tenantId;
    this.name = props.name;
    this.slug = props.slug;
    this.sortOrder = props.sortOrder;
    this.isActive = props.isActive;
  }
}
