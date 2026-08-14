import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useRentalsCalendar } from "@/features/rental-commitment/rentals/rentals.queries";
import { useBranches } from "@/modules/settings/branches/branches.queries";
import { useSelectedLocation } from "@/shared/contexts/location/location.hooks";
import { useSelectedBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { OrdersCalendar } from "./orders-calendar";
import {
	DEFAULT_ORDERS_CALENDAR_VIEW,
	getDefaultOrdersCalendarDate,
	type OrdersCalendarRange,
	type OrdersCalendarSearch,
} from "./orders-calendar.utils";

type OrdersCalendarPageProps = {
	search: OrdersCalendarSearch;
	onSearchChange: (search: OrdersCalendarSearch, replace?: boolean) => void;
};

export function OrdersCalendarPage({
	search,
	onSearchChange,
}: OrdersCalendarPageProps) {
	const navigate = useNavigate();
	const { data: branches } = useBranches();
	const selectedBranch = useSelectedLocation(branches ?? []);
	const timezone = useSelectedBranchTimezone();
	const currentView = search.view ?? DEFAULT_ORDERS_CALENDAR_VIEW;
	const currentDate = search.date ?? getDefaultOrdersCalendarDate(timezone);
	const [visibleRange, setVisibleRange] = useState<OrdersCalendarRange | null>(
		null,
	);
	const rentalsCalendarQuery =
		selectedBranch && visibleRange
			? {
					branchId: selectedBranch.id,
					from: visibleRange.from,
					to: visibleRange.to,
				}
			: undefined;

	const { data, isPending, isFetching, isError } =
		useRentalsCalendar(rentalsCalendarQuery);

	function handleRangeChange(nextRange: OrdersCalendarRange) {
		setVisibleRange(nextRange);

		if (currentView === nextRange.view && currentDate === nextRange.date) {
			return;
		}

		onSearchChange(
			{
				view: nextRange.view,
				date: nextRange.date,
			},
			!search.view || !search.date,
		);
	}

	if (!selectedBranch) {
		return (
			<div className="flex h-full items-center justify-center p-6">
				<div className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
					Selecciona una ubicacion para ver el calendario.
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 p-6">
			<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
				<div className="space-y-2">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight">
							Calendario
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							Visualiza pedidos en el tiempo para leer densidad, solapes y carga
							operativa de un vistazo.
						</p>
					</div>
				</div>

				<div className="text-right text-xs text-muted-foreground">
					<p>{timezone}</p>
					<p>{isFetching ? "Actualizando pedidos" : "Confirmados y activos"}</p>
				</div>
			</div>

			<OrdersCalendar
				currentDate={currentDate}
				currentView={currentView}
				timezone={timezone}
				orders={data ?? []}
				isLoading={isPending && !visibleRange}
				isFetching={isFetching}
				isError={isError}
				onRangeChange={handleRangeChange}
				onOrderClick={(orderId) =>
					navigate({
						to: "/dashboard/orders/$orderId",
						params: { orderId },
					})
				}
			/>
		</div>
	);
}
