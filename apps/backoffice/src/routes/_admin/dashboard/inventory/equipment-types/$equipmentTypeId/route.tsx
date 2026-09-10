import { createFileRoute } from "@tanstack/react-router";
import { EquipmentTypeDetailPage } from "@/modules/inventory/equipment-types/equipment-type-detail/EquipmentTypeDetailPage";
import { EquipmentDetailPageSkeleton } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-detail-page-skeleton";
import { equipmentTypeSummaryQueries } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-type-summary.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId",
)({
	loader: ({ context: { queryClient }, params: { equipmentTypeId } }) =>
		queryClient.ensureQueryData(
			equipmentTypeSummaryQueries.summary(equipmentTypeId),
		),
	pendingComponent: EquipmentDetailPageSkeleton,
	pendingMs: 0,
	pendingMinMs: 250,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el detalle del equipo."
			forbiddenMessage="No tienes permisos para ver este equipo."
		/>
	),
	component: EquipmentTypeDetailRoute,
});

function EquipmentTypeDetailRoute() {
	const { equipmentTypeId } = Route.useParams();

	return <EquipmentTypeDetailPage equipmentTypeId={equipmentTypeId} />;
}
