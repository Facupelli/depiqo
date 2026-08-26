import { createFileRoute } from "@tanstack/react-router";
import { EquipmentTypeDetailPage } from "@/modules/inventory/equipment-types/equipment-type-detail/EquipmentTypeDetailPage";
import { equipmentTypeDetailQueries } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-type-detail.queries";
import { equipmentTypeProductUsageQueries } from "@/modules/inventory/equipment-types/product-usages/equipment-type-product-usages.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId",
)({
	loader: ({ context: { queryClient }, params: { equipmentTypeId } }) =>
		Promise.all([
			queryClient.ensureQueryData(
				equipmentTypeDetailQueries.detail(equipmentTypeId),
			),
			queryClient.ensureQueryData(
				equipmentTypeProductUsageQueries.list([equipmentTypeId]),
			),
		]),
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el detalle del equipo."
			forbiddenMessage="No tienes permisos para ver este equipo."
		/>
	),
	component: () => (
		<EquipmentTypeDetailPage
			equipmentTypeId={Route.useParams().equipmentTypeId}
		/>
	),
});
