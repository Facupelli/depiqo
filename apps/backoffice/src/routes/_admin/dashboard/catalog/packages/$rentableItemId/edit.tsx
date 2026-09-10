import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { EditComboPage } from "@/modules/products/edit-combo/edit-combo-page";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId/edit",
)({ component: EditComboRoute });
function EditComboRoute() {
	const { rentableItemId } = Route.useParams();
	const { data } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	return <EditComboPage combo={data} />;
}
