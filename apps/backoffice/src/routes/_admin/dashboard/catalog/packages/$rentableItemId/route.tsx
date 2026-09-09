import {
	createFileRoute,
	Outlet,
	redirect,
	useRouterState,
} from "@tanstack/react-router";
import { ComboDetailPage } from "@/modules/products/combo-detail/combo-detail-page";
import { ComboDetailPageSkeleton } from "@/modules/products/combo-detail/combo-detail-page-skeleton";
import { isComboKind } from "@/modules/products/product-kind";
import { rentableItemDetailQueries } from "@/modules/products/rentable-item-detail/rentable-item-detail.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";
export const Route = createFileRoute(
	"/_admin/dashboard/catalog/packages/$rentableItemId",
)({
	loader: async ({ context: { queryClient }, params: { rentableItemId } }) => {
		const item = await queryClient.ensureQueryData(
			rentableItemDetailQueries.detail(rentableItemId),
		);
		if (!isComboKind(item.kind))
			throw redirect({
				to: "/dashboard/catalog/$rentableItemId",
				params: { rentableItemId },
			});
		return item;
	},
	pendingComponent: ComboDetailPageSkeleton,
	pendingMs: 0,
	pendingMinMs: 250,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el detalle del combo."
			forbiddenMessage="No tienes permisos para ver este combo."
		/>
	),
	component: ComboRoute,
});
function ComboRoute() {
	const { rentableItemId } = Route.useParams();
	const isEdit = useRouterState({
		select: ({ location }) =>
			location.pathname.replace(/\/$/, "").endsWith("/edit"),
	});
	return isEdit ? (
		<Outlet />
	) : (
		<ComboDetailPage rentableItemId={rentableItemId} />
	);
}
