import { randomUUID } from 'node:crypto';

import { err, ok, Result } from 'neverthrow';

import { AggregateRootBase } from 'src/core/domain/aggregate-root.base';

import {
  InvalidTenantNameError,
  InvalidTenantSlugError,
  TenantManagementError,
} from '../errors/tenant-management.errors';
import {
  TenantConfig,
  TenantConfigPatch,
  TenantOrderCommunicationMode,
} from '../value-objects/tenant-config.value-object';

interface TenantProps {
  name: string;
  slug: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  storefrontName: string | null;
  tagline: string | null;
  config: TenantConfig;
  activeBillingUnitId: string | null;
}

export interface CreateTenantProps {
  name: string;
  slug: string;
}

export interface ReconstituteTenantProps extends TenantProps {
  id: string;
}

export class Tenant extends AggregateRootBase {
  readonly id: string;
  private readonly props: TenantProps;

  private constructor(id: string, props: TenantProps) {
    super();
    this.id = id;
    this.props = props;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get logoUrl(): string | null {
    return this.props.logoUrl;
  }

  get faviconUrl(): string | null {
    return this.props.faviconUrl;
  }

  get primaryColor(): string | null {
    return this.props.primaryColor;
  }

  get accentColor(): string | null {
    return this.props.accentColor;
  }

  get storefrontName(): string | null {
    return this.props.storefrontName;
  }

  get tagline(): string | null {
    return this.props.tagline;
  }

  get config(): TenantConfig {
    return this.props.config;
  }

  get activeBillingUnitId(): string | null {
    return this.props.activeBillingUnitId;
  }

  static create(props: CreateTenantProps): Result<Tenant, TenantManagementError> {
    const name = props.name.trim();
    if (name.length === 0) {
      return err(new InvalidTenantNameError());
    }

    const slug = props.slug.trim();
    if (slug.length === 0) {
      return err(new InvalidTenantSlugError());
    }

    return ok(
      new Tenant(randomUUID(), {
        name,
        slug,
        logoUrl: null,
        faviconUrl: null,
        primaryColor: null,
        accentColor: null,
        storefrontName: null,
        tagline: null,
        config: TenantConfig.default(),
        activeBillingUnitId: null,
      }),
    );
  }

  static reconstitute(props: ReconstituteTenantProps): Tenant {
    return new Tenant(props.id, {
      name: props.name,
      slug: props.slug,
      logoUrl: props.logoUrl,
      faviconUrl: props.faviconUrl,
      primaryColor: props.primaryColor,
      accentColor: props.accentColor,
      storefrontName: props.storefrontName,
      tagline: props.tagline,
      config: props.config,
      activeBillingUnitId: props.activeBillingUnitId,
    });
  }

  updateConfig(patch: TenantConfigPatch): void {
    this.props.config = this.props.config.merge(patch);
  }

  enableWhatsAppMode(whatsAppNumber: string): void {
    this.updateConfig({
      communication: {
        orderCommunicationMode: TenantOrderCommunicationMode.WHATSAPP,
        whatsAppNumber,
      },
    });
  }

  updateBranding(props: {
    logoUrl: string | null;
    faviconUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    storefrontName: string | null;
    tagline: string | null;
  }): void {
    this.props.logoUrl = props.logoUrl;
    this.props.faviconUrl = props.faviconUrl;
    this.props.primaryColor = props.primaryColor;
    this.props.accentColor = props.accentColor;
    this.props.storefrontName = props.storefrontName;
    this.props.tagline = props.tagline;
  }

  activateBillingUnit(billingUnitId: string): void {
    this.props.activeBillingUnitId = billingUnitId;
  }

  deactivateBillingUnit(): void {
    this.props.activeBillingUnitId = null;
  }
}
