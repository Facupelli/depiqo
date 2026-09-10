import { createFileRoute } from "@tanstack/react-router";
import { EquipmentRentalsSection } from "@/modules/inventory/equipment-types/equipment-type-detail/rentals/equipment-rentals-section";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId/rentals",
)({ component: EquipmentRentalsRoute });

function EquipmentRentalsRoute() {
	const { equipmentTypeId } = Route.useParams();
	return <EquipmentRentalsSection equipmentTypeId={equipmentTypeId} />;
}
