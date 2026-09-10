import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@repo/ui/components/breadcrumb";
import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { formatOrderNumber } from "@/shared/utils/formatters";
import { RentalActivityLog } from "./components/rental-activity-log";
import { RentalDetailHeader } from "./components/rental-detail-header";
import { RentalEquipmentSection } from "./components/rental-equipment-section";
import { RentalOperationalSummary } from "./components/rental-operational-summary";
import { RentalSidebarCards } from "./components/rental-sidebar-cards";
import { rentalCustomerQueries } from "./customer-summary/rental-customer-summary.queries";
import { useRentalContractSigningSummary } from "./documents/signing/rental-contract-signing.queries";
import { RentalDetailProvider } from "./rental-detail.context";
import { rentalDetailViewQueries } from "./rental-detail.queries";

type RentalDetailPageProps = {
	orderId: string;
};

export function RentalDetailPage({ orderId }: RentalDetailPageProps) {
	const { data: rental } = useSuspenseQuery(
		rentalDetailViewQueries.detail(orderId),
	);
	const {
		data: customerSummary = null,
		isLoading: isCustomerSummaryLoading,
		isError: isCustomerSummaryError,
	} = useQuery(rentalCustomerQueries.summary(rental.customerId ?? undefined));
	const {
		data: contractSigningSummary = null,
		isLoading: isContractSigningSummaryLoading,
		isError: isContractSigningSummaryError,
	} = useRentalContractSigningSummary(rental.id);

	return (
		<div className="@container/rental-detail text-neutral-950">
			<Breadcrumb className="pb-4">
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink
							render={<Link to="/dashboard/orders">Alquileres</Link>}
						/>
					</BreadcrumbItem>
					<BreadcrumbSeparator className="hidden @5xl/rental-detail:block" />
					<BreadcrumbItem className="hidden min-w-0 @5xl/rental-detail:block">
						<BreadcrumbPage className="break-all">
							{formatOrderNumber(rental.rentalNumber)}
						</BreadcrumbPage>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>

			<RentalDetailProvider
				rental={rental}
				customerSummary={customerSummary}
				isCustomerSummaryLoading={isCustomerSummaryLoading}
				isCustomerSummaryError={isCustomerSummaryError}
				contractSigningSummary={contractSigningSummary}
				isContractSigningSummaryLoading={isContractSigningSummaryLoading}
				isContractSigningSummaryError={isContractSigningSummaryError}
			>
				<RentalDetailHeader />
				<RentalOperationalSummary />
				<div className="grid gap-6 pt-6 pb-8 @5xl/rental-detail:grid-cols-[minmax(0,1fr)_360px] @5xl/rental-detail:gap-8 @5xl/rental-detail:py-10">
					<RentalEquipmentSection />
					<div className="min-w-0 @5xl/rental-detail:col-start-2 @5xl/rental-detail:row-span-2 @5xl/rental-detail:row-start-1">
						<RentalSidebarCards />
					</div>
					<RentalActivityLog />
				</div>
			</RentalDetailProvider>
		</div>
	);
}
