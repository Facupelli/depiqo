import {
  TenantPermission,
  TenantPermissionSchema,
  type TenantPermission as TenantPermissionId,
} from '@repo/api-contracts';

export const TenantPermissionGroup = {
  Rentals: 'Rentals',
  Contracts: 'Contracts',
  Products: 'Products',
  Inventory: 'Inventory',
  Pricing: 'Pricing',
  Customers: 'Customers',
  BusinessSettings: 'Business settings',
  Team: 'Team',
} as const;

export type TenantPermissionGroup = (typeof TenantPermissionGroup)[keyof typeof TenantPermissionGroup];

export interface TenantPermissionMetadata {
  readonly id: TenantPermissionId;
  readonly group: TenantPermissionGroup;
  readonly label: string;
  readonly description: string;
}

const metadataByPermission = {
  [TenantPermission.RentalsRead]: permission(
    TenantPermission.RentalsRead,
    TenantPermissionGroup.Rentals,
    'View rentals',
    'Allows viewing rental proposals, requests, and confirmed rentals.',
  ),
  [TenantPermission.RentalsProposalsManage]: permission(
    TenantPermission.RentalsProposalsManage,
    TenantPermissionGroup.Rentals,
    'Manage rental proposals',
    'Allows creating and editing rental proposals and customer requests before confirmation.',
  ),
  [TenantPermission.RentalsConfirm]: permission(
    TenantPermission.RentalsConfirm,
    TenantPermissionGroup.Rentals,
    'Confirm rentals',
    'Allows confirming proposals and customer requests, committing equipment and accepted pricing.',
  ),
  [TenantPermission.RentalsConfirmedManage]: permission(
    TenantPermission.RentalsConfirmedManage,
    TenantPermissionGroup.Rentals,
    'Manage confirmed rentals',
    'Allows changing rental details after confirmation.',
  ),
  [TenantPermission.RentalsFulfillmentManage]: permission(
    TenantPermission.RentalsFulfillmentManage,
    TenantPermissionGroup.Rentals,
    'Manage rental fulfillment',
    'Allows preparing rental equipment, replacing assigned equipment, and managing rental accessories and preparation.',
  ),
  [TenantPermission.RentalsCancel]: permission(
    TenantPermission.RentalsCancel,
    TenantPermissionGroup.Rentals,
    'Cancel rentals',
    'Allows cancelling rental proposals, requests, and confirmed rentals.',
  ),
  [TenantPermission.RentalsPriceAdjustmentManage]: permission(
    TenantPermission.RentalsPriceAdjustmentManage,
    TenantPermissionGroup.Rentals,
    'Manage rental price adjustments',
    'Allows applying and changing manual price adjustments on rentals.',
  ),
  [TenantPermission.ContractsRead]: permission(
    TenantPermission.ContractsRead,
    TenantPermissionGroup.Contracts,
    'View contracts',
    'Allows viewing rental contracts and their signing status.',
  ),
  [TenantPermission.ContractsGenerate]: permission(
    TenantPermission.ContractsGenerate,
    TenantPermissionGroup.Contracts,
    'Generate contracts',
    'Allows generating rental contracts and related documents.',
  ),
  [TenantPermission.ContractsSigningSend]: permission(
    TenantPermission.ContractsSigningSend,
    TenantPermissionGroup.Contracts,
    'Send contracts for signing',
    'Allows sending rental contracts to customers for signature.',
  ),
  [TenantPermission.ProductsRead]: permission(
    TenantPermission.ProductsRead,
    TenantPermissionGroup.Products,
    'View products',
    'Allows viewing products, packages, and their rental details.',
  ),
  [TenantPermission.ProductsManage]: permission(
    TenantPermission.ProductsManage,
    TenantPermissionGroup.Products,
    'Manage products',
    'Allows creating, editing, and archiving products and packages.',
  ),
  [TenantPermission.ProductsAvailabilityManage]: permission(
    TenantPermission.ProductsAvailabilityManage,
    TenantPermissionGroup.Products,
    'Manage product availability',
    'Allows managing product branch availability, visibility, and rentability.',
  ),
  [TenantPermission.InventoryRead]: permission(
    TenantPermission.InventoryRead,
    TenantPermissionGroup.Inventory,
    'View inventory',
    'Allows viewing equipment, individual assets, and inventory status.',
  ),
  [TenantPermission.InventoryManage]: permission(
    TenantPermission.InventoryManage,
    TenantPermissionGroup.Inventory,
    'Manage inventory',
    'Allows adding, editing, activating, deactivating, and retiring inventory.',
  ),
  [TenantPermission.InventoryOwnershipManage]: permission(
    TenantPermission.InventoryOwnershipManage,
    TenantPermissionGroup.Inventory,
    'Manage inventory ownership',
    'Allows managing asset owners, ownership assignments, and owner agreements.',
  ),
  [TenantPermission.PricingRead]: permission(
    TenantPermission.PricingRead,
    TenantPermissionGroup.Pricing,
    'View pricing',
    'Allows viewing rates, promotions, and product pricing.',
  ),
  [TenantPermission.PricingManage]: permission(
    TenantPermission.PricingManage,
    TenantPermissionGroup.Pricing,
    'Manage pricing',
    'Allows creating and changing rates, promotions, and product pricing.',
  ),
  [TenantPermission.CustomersRead]: permission(
    TenantPermission.CustomersRead,
    TenantPermissionGroup.Customers,
    'View customers',
    'Allows viewing customer profiles and contact details.',
  ),
  [TenantPermission.CustomersOnboardingManage]: permission(
    TenantPermission.CustomersOnboardingManage,
    TenantPermissionGroup.Customers,
    'Manage customer onboarding',
    'Allows reviewing, approving, and rejecting customer registrations.',
  ),
  [TenantPermission.BranchesManage]: permission(
    TenantPermission.BranchesManage,
    TenantPermissionGroup.BusinessSettings,
    'Manage branches',
    'Allows creating and changing branches, locations, and operating schedules.',
  ),
  [TenantPermission.TenantSettingsManage]: permission(
    TenantPermission.TenantSettingsManage,
    TenantPermissionGroup.BusinessSettings,
    'Manage business settings',
    'Allows changing business-wide operational and notification settings.',
  ),
  [TenantPermission.TenantStorefrontManage]: permission(
    TenantPermission.TenantStorefrontManage,
    TenantPermissionGroup.BusinessSettings,
    'Manage storefront',
    'Allows changing storefront branding, domains, and public presentation.',
  ),
  [TenantPermission.TenantContractSignerManage]: permission(
    TenantPermission.TenantContractSignerManage,
    TenantPermissionGroup.BusinessSettings,
    'Manage contract signer',
    'Allows selecting and changing the business representative used on contracts.',
  ),
  [TenantPermission.TeamRead]: permission(
    TenantPermission.TeamRead,
    TenantPermissionGroup.Team,
    'View team',
    'Allows viewing collaborators, roles, and permission assignments.',
  ),
  [TenantPermission.TeamManage]: permission(
    TenantPermission.TeamManage,
    TenantPermissionGroup.Team,
    'Manage team',
    'Allows creating and managing collaborators, roles, and permission assignments.',
  ),
} as const satisfies Record<TenantPermissionId, TenantPermissionMetadata>;

export const TENANT_PERMISSION_REGISTRY: readonly TenantPermissionMetadata[] = Object.freeze(
  Object.values(metadataByPermission),
);

export const ALL_TENANT_PERMISSIONS: readonly TenantPermissionId[] = Object.freeze(
  TENANT_PERMISSION_REGISTRY.map(({ id }) => id),
);

export const DEFAULT_MEMBER_TENANT_PERMISSIONS: readonly TenantPermissionId[] = Object.freeze(
  TENANT_PERMISSION_REGISTRY.filter(({ group }) => group !== TenantPermissionGroup.Team).map(({ id }) => id),
);

export function getTenantPermissionMetadata(permissionId: TenantPermissionId): TenantPermissionMetadata {
  return metadataByPermission[permissionId];
}

export function isTenantPermission(value: string): value is TenantPermissionId {
  return TenantPermissionSchema.safeParse(value).success;
}

export function parseTenantPermission(value: string): TenantPermissionId {
  const result = TenantPermissionSchema.safeParse(value);
  if (!result.success) {
    throw new TypeError(`Unknown tenant permission: ${value}`);
  }

  return result.data;
}

export function assertTenantPermission(value: string): asserts value is TenantPermissionId {
  parseTenantPermission(value);
}

function permission(
  id: TenantPermissionId,
  group: TenantPermissionGroup,
  label: string,
  description: string,
): Readonly<TenantPermissionMetadata> {
  return Object.freeze({ id, group, label, description });
}
