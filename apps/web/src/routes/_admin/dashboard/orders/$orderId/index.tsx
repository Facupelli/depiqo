import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { formatOrderNumber } from "@/features/orders/order.utils";
import { ordersListSearchSchema } from "@/features/orders/orders-list.search";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { RentalDetailHeader } from "@/v2/features/rental-commitment/rentals/detail/components/rental-detail-header";
import { RentalEquipmentSection } from "@/v2/features/rental-commitment/rentals/detail/components/rental-equipment-section";
import { RentalSidebarCards } from "@/v2/features/rental-commitment/rentals/detail/components/rental-sidebar-cards";
import { RentalDetailProvider } from "@/v2/features/rental-commitment/rentals/detail/rental-detail.context";
import { rentalQueries } from "@/v2/features/rental-commitment/rentals/rentals.queries";

export const Route = createFileRoute("/_admin/dashboard/orders/$orderId/")({
	validateSearch: ordersListSearchSchema,
	loader: async ({ context: { queryClient }, params: { orderId } }) => {
		await Promise.all([
			queryClient.ensureQueryData(rentalQueries.detail(orderId)),
		]);
	},
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
	const { data: rental } = useSuspenseQuery(rentalQueries.detail(orderId));

	return (
		<div className="min-h-screen bg-neutral-50 text-neutral-950 px-8">
			<PageBreadcrumb
				parent={{ label: "Pedidos", to: "/dashboard/orders", search }}
				current={formatOrderNumber(rental.number)}
			/>

			<RentalDetailProvider rental={rental}>
				<RentalDetailHeader />
				<div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] py-10 gap-20">
					<div>
						<RentalEquipmentSection />
					</div>
					<RentalSidebarCards />
				</div>
			</RentalDetailProvider>
		</div>
	);
}
