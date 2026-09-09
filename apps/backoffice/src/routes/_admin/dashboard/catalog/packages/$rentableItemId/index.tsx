import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ComboSummarySection } from "@/modules/products/combo-detail/combo-summary-section";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId/",
)({ component: ComboSummaryRoute });
function ComboSummaryRoute() {
	const { rentableItemId } = Route.useParams();
	const { data } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	return <ComboSummarySection combo={data} />;
}
