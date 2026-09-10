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
				<h1 className="sr-only">Alquileres</h1>

				<div className="@container/rentals-index space-y-4">
					<RentalOrdersToolbar
						toolbarActions={
							<Link
								to="/dashboard/orders/new"
								className={buttonVariants({ className: "shrink-0" })}
							>
								Nuevo borrador
							</Link>
						}
					/>
					<RentalOrdersTable />
				</div>
			</div>
		</RentalOrdersListProvider>
	);
}
