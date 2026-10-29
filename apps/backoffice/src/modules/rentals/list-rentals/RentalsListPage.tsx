import {
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";
import { buttonVariants } from "@repo/ui/components/button";
import { Link } from "@tanstack/react-router";
import { can } from "@/auth/permissions";
import type { RentalOrdersListSearch } from "./components/rental-orders-list.context";
import { RentalOrdersListProvider } from "./components/rental-orders-list.context";
import { RentalOrdersTable } from "./components/rental-orders-table";
import { RentalOrdersToolbar } from "./components/rental-orders-toolbar";

export type RentalsListSearch = RentalOrdersListSearch;

type RentalsListPageProps = {
	search: RentalOrdersListSearch;
	permissions: readonly TenantPermissionId[];
	onSearchChange: (
		updater: (previous: RentalOrdersListSearch) => RentalOrdersListSearch,
	) => void;
};

export function RentalsListPage({
	search,
	permissions,
	onSearchChange,
}: RentalsListPageProps) {
	return (
		<RentalOrdersListProvider search={search} onSearchChange={onSearchChange}>
			<div className="min-w-0 space-y-4">
				<h1 className="sr-only">Alquileres</h1>

				<div className="@container/rentals-index min-w-0 space-y-5">
					<RentalOrdersToolbar
						toolbarActions={
							can(permissions, TenantPermission.RentalsProposalsManage) ? (
								<Link
									to="/dashboard/orders/new"
									className={buttonVariants({
										className:
											"h-10 shrink-0 rounded-lg shadow-none pointer-coarse:min-h-11",
									})}
								>
									Nuevo borrador
								</Link>
							) : null
						}
					/>
					<RentalOrdersTable />
				</div>
			</div>
		</RentalOrdersListProvider>
	);
}
