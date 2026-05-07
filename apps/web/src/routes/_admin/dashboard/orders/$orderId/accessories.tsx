import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { accessoryPreparationQueries } from "@/features/orders/accessory-preparation/accessory-preparation.queries";
import { AccessoryPreparationPage } from "@/features/orders/accessory-preparation/components/accessory-preparation-page";
import { createOrderDetailQueryOptions } from "@/features/orders/queries/get-order-by-id";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/orders/$orderId/accessories",
)({
	loader: async ({ context: { queryClient }, params: { orderId } }) => {
		await Promise.all([
			queryClient.ensureQueryData(createOrderDetailQueryOptions({ orderId })),
			queryClient.ensureQueryData(
				accessoryPreparationQueries.detail({ orderId }),
			),
		]);
	},
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar la preparacion de accesorios."
				forbiddenMessage="No tienes permisos para preparar accesorios de este pedido."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { orderId } = Route.useParams();
	const { data: order } = useSuspenseQuery(
		createOrderDetailQueryOptions({ orderId }),
	);
	const { data: preparation } = useSuspenseQuery(
		accessoryPreparationQueries.detail({ orderId }),
	);

	return (
		<AccessoryPreparationPage
			order={order}
			orderId={orderId}
			preparation={preparation}
		/>
	);
}
