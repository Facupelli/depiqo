import { TenantPermission } from "@repo/api-contracts";
import { createFileRoute } from "@tanstack/react-router";
import { can, requireRouteAccess } from "@/auth/permissions";
import { CreateEquipmentPage } from "@/modules/inventory/equipment-types/create-equipment/create-equipment-page";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/new",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			can(context.user.permissions, TenantPermission.InventoryManage),
		);
	},
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el formulario para crear el equipo."
			forbiddenMessage="No tienes permisos para crear equipos."
		/>
	),
	component: CreateEquipmentPage,
});
