import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { RentalDetailHeader } from "@/features/rental-commitment/rentals/detail/components/rental-detail-header";
import { RentalEquipmentSection } from "@/features/rental-commitment/rentals/detail/components/rental-equipment-section";
import { RentalSidebarCards } from "@/features/rental-commitment/rentals/detail/components/rental-sidebar-cards";
import { RentalDetailProvider } from "@/features/rental-commitment/rentals/detail/rental-detail.context";
import { rentalDetailViewQueries } from "@/features/rental-commitment/rentals/detail/rental-detail-view.queries";
import { ordersListSearchSchema } from "@/features/rental-commitment/rentals/get-rentals/orders-list.search";
import { rentalCustomerQueries } from "@/features/tenant-management/customer/rental-customer.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { formatOrderNumber } from "@/shared/utils/formatters";

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
	const { data: rental } = useSuspenseQuery(
		rentalDetailViewQueries.detail(orderId),
	);
	const {
		data: customerSummary = null,
		isLoading: isCustomerSummaryLoading,
		isError: isCustomerSummaryError,
	} = useQuery(rentalCustomerQueries.summary(rental.customerId ?? undefined));

	return (
		<div className="min-h-screen bg-neutral-50 text-neutral-950 px-8">
			<PageBreadcrumb
				parent={{ label: "Pedidos", to: "/dashboard/orders", search }}
				current={formatOrderNumber(rental.number)}
			/>

			<RentalDetailProvider
				rental={rental}
				customerSummary={customerSummary}
				isCustomerSummaryLoading={isCustomerSummaryLoading}
				isCustomerSummaryError={isCustomerSummaryError}
			>
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
