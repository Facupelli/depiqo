import { type GetOwnersItemDto, TenantPermission } from "@repo/api-contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { inventoryWorkspacePermissions } from "@/auth/capabilities";
import { can, canAny, requireRouteAccess } from "@/auth/permissions";
import { OwnersPage } from "@/modules/inventory/ownership/list-owners/OwnersPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/owners/")({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, inventoryWorkspacePermissions),
		);
	},
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar los propietarios."
				forbiddenMessage="No tienes permisos para ver los propietarios."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const navigate = useNavigate();
	const { user } = Route.useRouteContext();

	function handleOwnerSelect(owner: GetOwnersItemDto) {
		navigate({
			to: "/dashboard/owners/$ownerId",
			params: { ownerId: owner.id },
		});
	}

	return (
		<OwnersPage
			onOwnerSelect={handleOwnerSelect}
			canManageOwnership={can(
				user.permissions,
				TenantPermission.InventoryOwnershipManage,
			)}
		/>
	);
}
