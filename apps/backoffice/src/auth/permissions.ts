import type { TenantPermission } from "@repo/api-contracts";

export function can(
	permissions: readonly TenantPermission[],
	permission: TenantPermission,
): boolean {
	return permissions.includes(permission);
}

export function canAny(
	permissions: readonly TenantPermission[],
	requestedPermissions: readonly TenantPermission[],
): boolean {
	return requestedPermissions.some((permission) =>
		can(permissions, permission),
	);
}

export function canAll(
	permissions: readonly TenantPermission[],
	requestedPermissions: readonly TenantPermission[],
): boolean {
	return requestedPermissions.every((permission) =>
		can(permissions, permission),
	);
}
