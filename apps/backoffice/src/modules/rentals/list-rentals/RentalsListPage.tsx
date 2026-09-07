import { buttonVariants } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import type { RentalOrdersListSearch } from "./components/rental-orders-list.context";
import { RentalOrdersListProvider } from "./components/rental-orders-list.context";
import { RentalOrdersTable } from "./components/rental-orders-table";
import { RentalOrdersToolbar } from "./components/rental-orders-toolbar";

export type RentalsListSearch = RentalOrdersListSearch;

type RentalsListPageProps = {
	search: RentalOrdersListSearch;
	onSearchChange: (
		updater: (previous: RentalOrdersListSearch) => RentalOrdersListSearch,
	) => void;
};

export function RentalsListPage({
	search,
	onSearchChange,
}: RentalsListPageProps) {
	return (
		<RentalOrdersListProvider search={search} onSearchChange={onSearchChange}>
			<div className="space-y-4">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<h1 className="sr-only">Alquileres</h1>
					<Link
						to="/dashboard/orders/new"
						className={buttonVariants({ className: "ml-auto shrink-0" })}
					>
						Nuevo borrador
					</Link>
				</div>
				<div className="@container/rentals-index space-y-4">
					<RentalOrdersToolbar />
					<RentalOrdersTable />
				</div>
			</div>
		</RentalOrdersListProvider>
	);
}
