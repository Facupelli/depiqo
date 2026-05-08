import { OrderStatus } from "@repo/types";
import type { OrderHeaderBannerTone } from "./order.utils";

export type StatusConfig = {
	label: string;
	className: string;
};

// TODO: i already have a order-operational-phase-badge. what is the difference?
export const ORDER_STATUS_MAP: Record<OrderStatus, StatusConfig> = {
	[OrderStatus.DRAFT]: {
		label: "Borrador",
		className: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
	},
	[OrderStatus.PENDING_REVIEW]: {
		label: "Pendiente Revisión",
		className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
	},
	[OrderStatus.CONFIRMED]: {
		label: "Confirmado",
		className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
	},
	[OrderStatus.REJECTED]: {
		label: "Rechazado",
		className: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
	},
	[OrderStatus.EXPIRED]: {
		label: "Expirado",
		className: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
	},
	[OrderStatus.ACTIVE]: {
		label: "En Alquiler",
		className: "bg-purple-50 text-purple-700 ring-1 ring-purple-200",
	},
	[OrderStatus.COMPLETED]: {
		label: "Completado",
		className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
	},
	[OrderStatus.CANCELLED]: {
		label: "Cancelado",
		className: "bg-red-50 text-red-600 ring-1 ring-red-200",
	},
};

export const ORDER_HEADER_BANNER_TONE_STYLES: Record<
	OrderHeaderBannerTone,
	{
		panelClassName: string;
		iconWrapClassName: string;
		iconClassName: string;
		metaClassName: string;
	}
> = {
	neutral: {
		panelClassName: "border-neutral-200 bg-white",
		iconWrapClassName: "bg-neutral-100 text-neutral-700",
		iconClassName: "text-neutral-700",
		metaClassName: "text-neutral-500",
	},
	info: {
		panelClassName: "border-sky-200 bg-sky-50/80",
		iconWrapClassName: "bg-sky-100 text-sky-700",
		iconClassName: "text-sky-700",
		metaClassName: "text-sky-800/80",
	},
	warning: {
		panelClassName: "border-amber-200 bg-amber-50/80",
		iconWrapClassName: "bg-amber-100 text-amber-700",
		iconClassName: "text-amber-700",
		metaClassName: "text-amber-900/80",
	},
	danger: {
		panelClassName: "border-red-200 bg-red-50/80",
		iconWrapClassName: "bg-red-100 text-red-700",
		iconClassName: "text-red-700",
		metaClassName: "text-red-900/80",
	},
	success: {
		panelClassName: "border-emerald-200 bg-emerald-50/80",
		iconWrapClassName: "bg-emerald-100 text-emerald-700",
		iconClassName: "text-emerald-700",
		metaClassName: "text-emerald-900/80",
	},
	muted: {
		panelClassName: "border-neutral-200 bg-neutral-100/80",
		iconWrapClassName: "bg-neutral-200 text-neutral-600",
		iconClassName: "text-neutral-600",
		metaClassName: "text-neutral-600",
	},
};
