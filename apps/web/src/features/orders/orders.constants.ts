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
		metaClassName: "",
	},
	info: {
		panelClassName: "border-neutral-200 bg-white",
		iconWrapClassName: "bg-neutral-100 text-neutral-700",
		iconClassName: "text-neutral-700",
		metaClassName: "",
	},
	warning: {
		panelClassName: "border-neutral-200 bg-white",
		iconWrapClassName: "bg-neutral-100 text-neutral-700",
		iconClassName: "text-neutral-700",
		metaClassName: "",
	},
	danger: {
		panelClassName: "border-neutral-200 bg-white",
		iconWrapClassName: "bg-red-50 text-red-600",
		iconClassName: "text-red-600",
		metaClassName: "",
	},
	success: {
		panelClassName: "border-neutral-200 bg-white",
		iconWrapClassName: "bg-neutral-100 text-neutral-700",
		iconClassName: "text-neutral-700",
		metaClassName: "",
	},
	muted: {
		panelClassName: "border-neutral-200 bg-white",
		iconWrapClassName: "bg-neutral-100 text-neutral-700",
		iconClassName: "text-neutral-700",
		metaClassName: "",
	},
};
