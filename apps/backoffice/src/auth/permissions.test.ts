import { TenantPermission } from "@repo/api-contracts";
import { describe, expect, it } from "vitest";
import { can, canAll, canAny } from "./permissions";

const effectivePermissions = [
	TenantPermission.InventoryManage,
	TenantPermission.TeamRead,
	TenantPermission.TeamManage,
	TenantPermission.ProductsManage,
] as const;

describe("can", () => {
	it("returns true when the permission exists", () => {
		expect(can(effectivePermissions, TenantPermission.InventoryManage)).toBe(
			true,
		);
	});

	it("returns false when the permission does not exist", () => {
		expect(can(effectivePermissions, TenantPermission.CustomersRead)).toBe(
			false,
		);
	});
});

describe("canAny", () => {
	it("returns true when one requested permission matches", () => {
		expect(
			canAny(effectivePermissions, [
				TenantPermission.CustomersRead,
				TenantPermission.TeamRead,
			]),
		).toBe(true);
	});

	it("returns true when several requested permissions match", () => {
		expect(
			canAny(effectivePermissions, [
				TenantPermission.TeamManage,
				TenantPermission.TeamRead,
			]),
		).toBe(true);
	});

	it("returns false when no requested permissions match", () => {
		expect(
			canAny(effectivePermissions, [
				TenantPermission.CustomersRead,
				TenantPermission.PricingRead,
			]),
		).toBe(false);
	});

	it("returns false for an empty requested list", () => {
		expect(canAny(effectivePermissions, [])).toBe(false);
	});
});

describe("canAll", () => {
	it("returns true when all requested permissions exist", () => {
		expect(
			canAll(effectivePermissions, [
				TenantPermission.ProductsManage,
				TenantPermission.TeamRead,
			]),
		).toBe(true);
	});

	it("returns false when one requested permission is missing", () => {
		expect(
			canAll(effectivePermissions, [
				TenantPermission.ProductsManage,
				TenantPermission.ProductsAvailabilityManage,
			]),
		).toBe(false);
	});

	it("returns true for an empty requested list", () => {
		expect(canAll(effectivePermissions, [])).toBe(true);
	});
});

describe("permission collection semantics", () => {
	it("does not depend on permission ordering", () => {
		const reorderedPermissions = [...effectivePermissions].reverse();

		expect(
			canAll(reorderedPermissions, [
				TenantPermission.TeamRead,
				TenantPermission.InventoryManage,
			]),
		).toBe(true);
	});

	it("allows duplicate effective permissions", () => {
		const duplicateEffectivePermissions = [
			TenantPermission.TeamRead,
			TenantPermission.TeamRead,
		];

		expect(can(duplicateEffectivePermissions, TenantPermission.TeamRead)).toBe(
			true,
		);
	});

	it("allows duplicate requested permissions", () => {
		const duplicateRequestedPermissions = [
			TenantPermission.TeamRead,
			TenantPermission.TeamRead,
		] as const;

		expect(canAny(effectivePermissions, duplicateRequestedPermissions)).toBe(
			true,
		);
		expect(canAll(effectivePermissions, duplicateRequestedPermissions)).toBe(
			true,
		);
	});
});
