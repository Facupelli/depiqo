import type { TenantPermission } from "@repo/api-contracts";
import { RoutePermissionDeniedError } from "@/shared/errors";

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

export function requireRouteAccess(hasAccess: boolean): void {
	if (!hasAccess) {
		throw new RoutePermissionDeniedError();
	}
}
