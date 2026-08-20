import { Button } from "@repo/ui/components/button";
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
			<div className="space-y-6 p-6">
				<RentalsListPageHeader />
				<RentalOrdersToolbar />
				<RentalOrdersTable />
			</div>
		</RentalOrdersListProvider>
	);
}

function RentalsListPageHeader() {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Alquileres</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Lista operativa para revisar, filtrar y entrar rápido al detalle del
					alquiler.
				</p>
			</div>

			<Button render={<Link to="/dashboard/orders/new">Nuevo borrador</Link>} />
		</div>
	);
}
