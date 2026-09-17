import {
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";

export const rentalWorkspacePermissions = [
	TenantPermission.RentalsRead,
	TenantPermission.RentalsProposalsManage,
	TenantPermission.RentalsConfirm,
	TenantPermission.RentalsConfirmedManage,
	TenantPermission.RentalsFulfillmentManage,
	TenantPermission.RentalsCancel,
	TenantPermission.ContractsRead,
	TenantPermission.ContractsGenerate,
	TenantPermission.ContractsSigningSend,
] as const satisfies readonly TenantPermissionId[];

export const inventoryWorkspacePermissions = [
	TenantPermission.InventoryRead,
	TenantPermission.InventoryManage,
	TenantPermission.InventoryOwnershipManage,
] as const satisfies readonly TenantPermissionId[];

export const productWorkspacePermissions = [
	TenantPermission.ProductsRead,
	TenantPermission.ProductsManage,
	TenantPermission.ProductsAvailabilityManage,
	TenantPermission.PricingRead,
	TenantPermission.PricingManage,
] as const satisfies readonly TenantPermissionId[];

export const productCompositionPermissions = [
	TenantPermission.ProductsRead,
	TenantPermission.ProductsManage,
] as const satisfies readonly TenantPermissionId[];

export const categoryWorkspacePermissions = [
	TenantPermission.ProductsRead,
	TenantPermission.ProductsManage,
	TenantPermission.InventoryRead,
	TenantPermission.InventoryManage,
] as const satisfies readonly TenantPermissionId[];

export const customerListPermissions = [
	TenantPermission.CustomersRead,
	TenantPermission.CustomersOnboardingManage,
] as const satisfies readonly TenantPermissionId[];

export const promotionListPermissions = [
	TenantPermission.PricingRead,
	TenantPermission.PricingManage,
] as const satisfies readonly TenantPermissionId[];

export const teamWorkspacePermissions = [
	TenantPermission.TeamRead,
	TenantPermission.TeamManage,
] as const satisfies readonly TenantPermissionId[];

export const workingBranchContextPermissions = [
	...rentalWorkspacePermissions,
	...inventoryWorkspacePermissions,
	...productWorkspacePermissions,
] as const satisfies readonly TenantPermissionId[];

export const settingsPermissions = [
	TenantPermission.TenantSettingsManage,
	TenantPermission.BranchesManage,
	TenantPermission.TenantStorefrontManage,
	TenantPermission.TenantContractSignerManage,
	...teamWorkspacePermissions,
] as const satisfies readonly TenantPermissionId[];
