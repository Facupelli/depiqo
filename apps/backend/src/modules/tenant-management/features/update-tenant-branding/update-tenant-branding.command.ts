export class UpdateTenantBrandingCommand {
  public readonly tenantId: string;
  public readonly logoUrl: string | null;
  public readonly faviconUrl: string | null;
  public readonly primaryColor: string | null;
  public readonly accentColor: string | null;
  public readonly storefrontName: string | null;
  public readonly tagline: string | null;

  constructor(props: {
    tenantId: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    storefrontName: string | null;
    tagline: string | null;
  }) {
    this.tenantId = props.tenantId;
    this.logoUrl = props.logoUrl;
    this.faviconUrl = props.faviconUrl;
    this.primaryColor = props.primaryColor;
    this.accentColor = props.accentColor;
    this.storefrontName = props.storefrontName;
    this.tagline = props.tagline;
  }
}
