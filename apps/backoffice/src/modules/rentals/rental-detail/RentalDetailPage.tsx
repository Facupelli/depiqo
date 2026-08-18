import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { formatOrderNumber } from "@/shared/utils/formatters";
import { RentalDetailHeader } from "./components/rental-detail-header";
import { RentalEquipmentSection } from "./components/rental-equipment-section";
import { RentalSidebarCards } from "./components/rental-sidebar-cards";
import { rentalCustomerQueries } from "./customer-summary/rental-customer-summary.queries";
import { RentalDetailProvider } from "./rental-detail.context";
import { rentalDetailViewQueries } from "./rental-detail.queries";

type RentalDetailPageProps = {
	orderId: string;
	ordersSearch: Record<string, unknown>;
};

export function RentalDetailPage({
	orderId,
	ordersSearch,
}: RentalDetailPageProps) {
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
				parent={{
					label: "Pedidos",
					to: "/dashboard/orders",
					search: ordersSearch,
				}}
				current={formatOrderNumber(rental.rentalNumber)}
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
