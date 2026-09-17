import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { productCompositionPermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";
import { ComboEquipmentSection } from "@/modules/products/combo-detail/combo-equipment-section";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId/equipment",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, productCompositionPermissions),
		);
	},
	component: ComboEquipmentRoute,
});
function ComboEquipmentRoute() {
	const { rentableItemId } = Route.useParams();
	const { data } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	return <ComboEquipmentSection combo={data} />;
}
