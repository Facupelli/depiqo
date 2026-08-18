import { createFileRoute } from "@tanstack/react-router";
import { ordersListSearchSchema } from "@/modules/rentals/list-rentals/rentals-list.search";
import { RentalDetailPageSkeleton } from "@/modules/rentals/rental-detail/components/rental-detail-page-skeleton";
import { rentalCustomerQueries } from "@/modules/rentals/rental-detail/customer-summary/rental-customer-summary.queries";
import { RentalDetailPage } from "@/modules/rentals/rental-detail/RentalDetailPage";
import { rentalDetailViewQueries } from "@/modules/rentals/rental-detail/rental-detail.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute("/_admin/dashboard/orders/$orderId/")({
	validateSearch: ordersListSearchSchema,
	loader: async ({ context: { queryClient }, params: { orderId } }) => {
		const rental = await queryClient.ensureQueryData(
			rentalDetailViewQueries.detail(orderId),
		);

		if (rental.customerId) {
			await queryClient.prefetchQuery(
				rentalCustomerQueries.summary(rental.customerId),
			);
		}
	},
	pendingComponent: RentalDetailPageSkeleton,
	pendingMs: 0,
	pendingMinMs: 250,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el contenido del pedido."
				forbiddenMessage="No tienes permisos para ver el pedido."
			/>
		);
	},
	component: RouteComponent,
});

function RouteComponent() {
	const { orderId } = Route.useParams();
	const search = Route.useSearch();

	return <RentalDetailPage orderId={orderId} ordersSearch={search} />;
}
