import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { z } from "zod";
import {
	ORDERS_CALENDAR_VIEWS,
	type OrdersCalendarSearch,
} from "@/modules/rentals/rental-calendar/orders-calendar.utils";
import { OrdersCalendarPage } from "@/modules/rentals/rental-calendar/orders-calendar-page";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const ordersCalendarSearchSchema = z.object({
	view: z.enum(ORDERS_CALENDAR_VIEWS).optional(),
	date: z.iso.date().optional(),
});

export const Route = createFileRoute("/_admin/dashboard/calendar/")({
	validateSearch: ordersCalendarSearchSchema,
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el calendario."
				forbiddenMessage="No tienes permisos para ver el calendario."
			/>
		);
	},
	component: CalendarRoute,
});

function CalendarRoute() {
	const search = Route.useSearch();
	const navigate = useNavigate({ from: Route.fullPath });

	const handleSearchChange = useCallback(
		(nextSearch: OrdersCalendarSearch, replace = false) => {
			navigate({
				to: ".",
				search: nextSearch,
				replace,
			});
		},
		[navigate],
	);

	return (
		<OrdersCalendarPage search={search} onSearchChange={handleSearchChange} />
	);
}
