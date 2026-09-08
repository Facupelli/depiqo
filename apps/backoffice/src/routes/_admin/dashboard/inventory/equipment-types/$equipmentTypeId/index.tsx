import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EquipmentOverview } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-overview";
import { equipmentTypeSummaryQueries } from "@/modules/inventory/equipment-types/equipment-type-detail/equipment-type-summary.queries";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId/",
)({
	component: EquipmentOverviewRoute,
});

function EquipmentOverviewRoute() {
	const { equipmentTypeId } = Route.useParams();
	const { data: summary } = useSuspenseQuery(
		equipmentTypeSummaryQueries.summary(equipmentTypeId),
	);

	return <EquipmentOverview summary={summary} />;
}
