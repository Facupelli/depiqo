import { createFileRoute } from "@tanstack/react-router";
import { EquipmentAccessoriesSection } from "@/modules/inventory/equipment-types/equipment-type-detail/accessories/equipment-accessories-section";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId/accessories",
)({
	component: EquipmentAccessoriesRoute,
});

function EquipmentAccessoriesRoute() {
	const { equipmentTypeId } = Route.useParams();

	return <EquipmentAccessoriesSection equipmentTypeId={equipmentTypeId} />;
}
