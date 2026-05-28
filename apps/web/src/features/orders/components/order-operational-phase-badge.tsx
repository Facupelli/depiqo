import dayjs from "dayjs";
import {
	getOrderOperationalPhase,
	type OrderOperationalPhase,
} from "@/features/orders/order.utils";
import type { ParsedRentalListItem } from "@/v2/features/rental-commitment/rentals/rentals.queries";

const ORDER_OPERATIONAL_PHASE_MAP: Record<
	OrderOperationalPhase,
	{ label: string; className: string }
> = {
	draft: {
		label: "Borrador",
		className: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
	},
	"pending-pickup": {
		label: "Pendiente retiro",
		className: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
	},
	"pickup-overdue": {
		label: "Retiro vencido",
		className: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
	},
	active: {
		label: "En alquiler",
		className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
	},
	overdue: {
		label: "Vencido",
		className: "bg-red-50 text-red-700 ring-1 ring-red-200",
	},
	completed: {
		label: "Completado",
		className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
	},
	cancelled: {
		label: "Cancelado",
		className: "bg-red-50 text-red-600 ring-1 ring-red-200",
	},
	rejected: {
		label: "Rechazado",
		className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
	},
	expired: {
		label: "Expirado",
		className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
	},
};

export function OrderOperationalPhaseBadge({
	order,
}: {
	order: Pick<ParsedRentalListItem, "status" | "pickupAt" | "returnAt">;
}) {
	const phase = getOrderOperationalPhase(order, dayjs());
	const config = ORDER_OPERATIONAL_PHASE_MAP[phase];

	return (
		<span
			className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase ${config.className}`}
		>
			{config.label}
		</span>
	);
}
