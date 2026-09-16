import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { canAny } from "@/auth/permissions";
import { productCompositionPermissions } from "@/auth/capabilities";

export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId/",
)({
	beforeLoad: ({ context, params: { rentableItemId } }) => {
		if (canAny(context.user.permissions, productCompositionPermissions)) {
			throw redirect({
				to: "/dashboard/catalog/packages/$rentableItemId/equipment",
				params: { rentableItemId },
			});
		}

		if (
			canAny(context.user.permissions, [
				TenantPermission.ProductsAvailabilityManage,
				TenantPermission.PricingRead,
				TenantPermission.PricingManage,
			])
		) {
			throw redirect({
				to: "/dashboard/catalog/packages/$rentableItemId/rental",
				params: { rentableItemId },
			});
		}
	},
});
