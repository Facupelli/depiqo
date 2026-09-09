import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ComboRentalSection } from "@/modules/products/combo-detail/combo-rental-section";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId/rental",
)({ component: ComboRentalRoute });
function ComboRentalRoute() {
	const { rentableItemId } = Route.useParams();
	const { data } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	return <ComboRentalSection combo={data} />;
}
