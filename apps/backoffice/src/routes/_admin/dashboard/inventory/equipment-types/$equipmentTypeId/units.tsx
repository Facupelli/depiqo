import { GetEquipmentTypeAssetsQuerySchema } from "@repo/api-contracts";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { EquipmentUnitsSection } from "@/modules/inventory/equipment-types/equipment-type-detail/units/equipment-units-section";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId/units",
)({
	validateSearch: GetEquipmentTypeAssetsQuerySchema,
	component: EquipmentUnitsRoute,
});

function EquipmentUnitsRoute() {
	const { equipmentTypeId } = Route.useParams();
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	return (
		<EquipmentUnitsSection
			equipmentTypeId={equipmentTypeId}
			search={search}
			onSearchChange={(updater) => {
				navigate({ search: updater, replace: true });
			}}
		/>
	);
}
