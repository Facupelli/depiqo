import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { productWorkspacePermissions } from "@/auth/capabilities";
import { canAny, requireRouteAccess } from "@/auth/permissions";
import { ComboRentalSection } from "@/modules/products/combo-detail/combo-rental-section";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId/rental",
)({
	beforeLoad: ({ context }) => {
		requireRouteAccess(
			canAny(context.user.permissions, productWorkspacePermissions),
		);
	},
	component: ComboRentalRoute,
});
function ComboRentalRoute() {
	const { user } = Route.useRouteContext();
	const { rentableItemId } = Route.useParams();
	const { data } = useSuspenseQuery(
		rentableItemDetailQueries.detail(rentableItemId),
	);
	return <ComboRentalSection combo={data} permissions={user.permissions} />;
}
