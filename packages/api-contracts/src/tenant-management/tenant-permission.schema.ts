import { z } from "zod";

export const TenantPermission = {
  RentalsRead: "rentals.read",
  RentalsProposalsManage: "rentals.proposals.manage",
  RentalsConfirm: "rentals.confirm",
  RentalsConfirmedManage: "rentals.confirmed.manage",
  RentalsFulfillmentManage: "rentals.fulfillment.manage",
  RentalsCancel: "rentals.cancel",
  RentalsPriceAdjustmentManage: "rentals.price_adjustment.manage",
  ContractsRead: "contracts.read",
  ContractsGenerate: "contracts.generate",
  ContractsSigningSend: "contracts.signing.send",
  ProductsRead: "products.read",
  ProductsManage: "products.manage",
  ProductsAvailabilityManage: "products.availability.manage",
  InventoryRead: "inventory.read",
  InventoryManage: "inventory.manage",
  InventoryOwnershipManage: "inventory.ownership.manage",
  PricingRead: "pricing.read",
  PricingManage: "pricing.manage",
  CustomersRead: "customers.read",
  CustomersOnboardingManage: "customers.onboarding.manage",
  BranchesManage: "branches.manage",
  TenantSettingsManage: "tenant.settings.manage",
  TenantStorefrontManage: "tenant.storefront.manage",
  TenantContractSignerManage: "tenant.contract_signer.manage",
  TeamRead: "team.read",
  TeamManage: "team.manage",
} as const;

export type TenantPermission =
  (typeof TenantPermission)[keyof typeof TenantPermission];

export const TenantPermissionSchema = z.enum(
  Object.values(TenantPermission) as [TenantPermission, ...TenantPermission[]],
);
