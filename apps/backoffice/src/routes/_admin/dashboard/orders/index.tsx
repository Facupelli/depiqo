import {
	type GetRentalsQueryDto,
	GetRentalsQuerySchema,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { createFileRoute, Link } from "@tanstack/react-router";
import { RentalOrdersListProvider } from "@/features/rental-commitment/rentals/get-rentals/components/rental-orders-list.context";
import { RentalOrdersTable } from "@/features/rental-commitment/rentals/get-rentals/components/rental-orders-table";
import { RentalOrdersToolbar } from "@/features/rental-commitment/rentals/get-rentals/components/rental-orders-toolbar";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export type OrdersListSearch = GetRentalsQueryDto;

export const Route = createFileRoute("/_admin/dashboard/orders/")({
	validateSearch: GetRentalsQuerySchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar los pedidos."
				forbiddenMessage="No tienes permisos para ver los pedidos."
			/>
		);
	},
	component: OrdersPage,
});

function OrdersPage() {
	return (
		<RentalOrdersListProvider>
			<div className="space-y-6 p-6">
				<OrdersPageHeader />
				<RentalOrdersToolbar />
				<RentalOrdersTable />
			</div>
		</RentalOrdersListProvider>
	);
}

function OrdersPageHeader() {
	return (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight">Pedidos</h1>
				<p className="mt-1 text-sm text-muted-foreground">
					Lista operativa para revisar, filtrar y entrar rápido al detalle del
					pedido.
				</p>
			</div>

			<Button render={<Link to="/dashboard/orders/new">Nuevo borrador</Link>} />
		</div>
	);
}
