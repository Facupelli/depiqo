import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PendingReviewOrdersTable } from "@/features/orders/components/pending-review-orders-table";
import { PendingReviewOrdersToolbar } from "@/features/orders/components/pending-review-orders-toolbar";
import { usePendingReviewOrders } from "@/features/orders/orders.queries";
import {
	type PendingReviewOrdersSearch,
	pendingReviewOrdersSearchSchema,
} from "@/features/orders/pending-review-orders.search";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/orders/pending-review/",
)({
	validateSearch: pendingReviewOrdersSearchSchema,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar los pedidos pendientes de revisión."
			forbiddenMessage="No tienes permisos para ver los pedidos pendientes de revisión."
		/>
	),
	component: PendingReviewOrdersPage,
});

function PendingReviewOrdersPage() {
	const navigate = useNavigate();
	const search = Route.useSearch();
	const { data, isLoading, isError } = usePendingReviewOrders(search);

	const orders = data?.data ?? [];
	const meta = data?.meta;

	function updateSearch(
		updater: (prev: PendingReviewOrdersSearch) => PendingReviewOrdersSearch,
	) {
		navigate({
			from: Route.fullPath,
			to: ".",
			search: (prev) => updater(prev),
		});
	}

	return (
		<div className="space-y-6 p-6">
			<div className="space-y-2">
				<h1 className="text-2xl font-semibold tracking-tight">
					Pedidos pendientes de revisión
				</h1>
				<p className="text-sm text-muted-foreground">
					Estas solicitudes todavía no reservan inventario hasta ser aprobadas.
				</p>
			</div>

			<PendingReviewOrdersToolbar
				search={search}
				onLocationChange={(locationId) =>
					updateSearch((prev) => ({ ...prev, locationId, page: 1 }))
				}
			/>

			<PendingReviewOrdersTable
				orders={orders}
				meta={meta}
				search={search}
				isLoading={isLoading}
				isError={isError}
				onPageChange={(page) => updateSearch((prev) => ({ ...prev, page }))}
				onRowClick={(order) =>
					navigate({
						to: "/dashboard/orders/$orderId",
						params: { orderId: order.id },
						search,
					})
				}
			/>
		</div>
	);
}
