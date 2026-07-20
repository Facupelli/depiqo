import type { GetRentalsStatusDto } from "@repo/api-contracts";
import type { Dayjs } from "dayjs";

export const RENTAL_ORDER_STATUS_OPTIONS = [
	"DRAFT",
	"PENDING",
	"CONFIRMED",
	"PREPARED",
	"CANCELLED",
	"COMPLETED",
] as const satisfies readonly GetRentalsStatusDto[];

export type RentalOrderEffectiveStatus =
	| GetRentalsStatusDto
	| "IN_PROGRESS"
	| "FINISHED";

export type RentalOrderStatusPresentation = {
	status: RentalOrderEffectiveStatus;
	label: string;
	badgeClassName: string;
	calendarEventClassName: string;
	dotClassName: string;
	headingClassName: string;
	legendDotClassName: string;
};

export const RENTAL_ORDER_STATUS_PRESENTATION: Record<
	RentalOrderEffectiveStatus,
	RentalOrderStatusPresentation
> = {
	DRAFT: {
		status: "DRAFT",
		label: "Borrador",
		badgeClassName: "bg-stone-100 text-stone-700 ring-1 ring-stone-300",
		calendarEventClassName: "orders-calendar-event--draft",
		dotClassName: "bg-stone-500",
		headingClassName: "text-stone-700",
		legendDotClassName: "bg-stone-500",
	},
	PENDING: {
		status: "PENDING",
		label: "Pendiente Revisión",
		badgeClassName: "bg-orange-100 text-orange-800 ring-1 ring-orange-300",
		calendarEventClassName: "orders-calendar-event--pending",
		dotClassName: "bg-orange-500",
		headingClassName: "text-orange-800",
		legendDotClassName: "bg-orange-500",
	},
	CONFIRMED: {
		status: "CONFIRMED",
		label: "Confirmado",
		badgeClassName: "bg-blue-100 text-blue-800 ring-1 ring-blue-300",
		calendarEventClassName: "orders-calendar-event--confirmed",
		dotClassName: "bg-blue-500",
		headingClassName: "text-blue-800",
		legendDotClassName: "bg-blue-500",
	},
	PREPARED: {
		status: "PREPARED",
		label: "Preparado",
		badgeClassName: "bg-cyan-100 text-cyan-800 ring-1 ring-cyan-300",
		calendarEventClassName: "orders-calendar-event--prepared",
		dotClassName: "bg-cyan-500",
		headingClassName: "text-cyan-800",
		legendDotClassName: "bg-cyan-500",
	},
	IN_PROGRESS: {
		status: "IN_PROGRESS",
		label: "En curso",
		badgeClassName: "bg-violet-100 text-violet-800 ring-1 ring-violet-300",
		calendarEventClassName: "orders-calendar-event--in-progress",
		dotClassName: "bg-violet-500",
		headingClassName: "text-violet-800",
		legendDotClassName: "bg-violet-500",
	},
	FINISHED: {
		status: "FINISHED",
		label: "Terminado",
		badgeClassName: "bg-teal-100 text-teal-800 ring-1 ring-teal-300",
		calendarEventClassName: "orders-calendar-event--finished",
		dotClassName: "bg-teal-500",
		headingClassName: "text-teal-800",
		legendDotClassName: "bg-teal-500",
	},
	COMPLETED: {
		status: "COMPLETED",
		label: "Completado",
		badgeClassName: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-300",
		calendarEventClassName: "orders-calendar-event--completed",
		dotClassName: "bg-emerald-500",
		headingClassName: "text-emerald-800",
		legendDotClassName: "bg-emerald-500",
	},
	CANCELLED: {
		status: "CANCELLED",
		label: "Cancelado",
		badgeClassName: "bg-red-100 text-red-700 ring-1 ring-red-300",
		calendarEventClassName: "orders-calendar-event--cancelled",
		dotClassName: "bg-red-500",
		headingClassName: "text-red-700",
		legendDotClassName: "bg-red-500",
	},
};

const RENTAL_ORDER_LEGEND_STATUSES = [
	"DRAFT",
	"PENDING",
	"CONFIRMED",
	"PREPARED",
	"IN_PROGRESS",
	"FINISHED",
] as const satisfies readonly RentalOrderEffectiveStatus[];

export const RENTAL_ORDER_STATUS_LEGEND_ITEMS =
	RENTAL_ORDER_LEGEND_STATUSES.map((status) => ({
		label: RENTAL_ORDER_STATUS_PRESENTATION[status].label,
		colorClass: RENTAL_ORDER_STATUS_PRESENTATION[status].legendDotClassName,
	}));

export function getRentalOrderStatusPresentation(
	rental: Pick<RentalOrderPeriodAware, "status" | "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
): RentalOrderStatusPresentation {
	return RENTAL_ORDER_STATUS_PRESENTATION[
		getRentalOrderEffectiveStatus(rental, referenceDate)
	];
}

export function getRentalOrderStatusLabel(status: GetRentalsStatusDto): string {
	return RENTAL_ORDER_STATUS_PRESENTATION[status].label;
}

function getRentalOrderEffectiveStatus(
	rental: Pick<RentalOrderPeriodAware, "status" | "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
): RentalOrderEffectiveStatus {
	if (rental.status === "CANCELLED" || rental.status === "COMPLETED") {
		return rental.status;
	}

	if (isRentalOrderPeriodAwareStatus(rental.status)) {
		if (isRentalOrderInProgress(rental, referenceDate)) return "IN_PROGRESS";
		if (isRentalOrderPastReturn(rental, referenceDate)) return "FINISHED";
	}

	return rental.status;
}

type RentalOrderPeriodAware = {
	status: GetRentalsStatusDto;
	pickupAt: Dayjs;
	returnAt: Dayjs;
};

function isRentalOrderPeriodAwareStatus(status: GetRentalsStatusDto): boolean {
	return status === "CONFIRMED" || status === "PREPARED";
}

function isRentalOrderInProgress(
	rental: Pick<RentalOrderPeriodAware, "pickupAt" | "returnAt">,
	referenceDate: Dayjs,
): boolean {
	return (
		(referenceDate.isSame(rental.pickupAt) ||
			referenceDate.isAfter(rental.pickupAt)) &&
		referenceDate.isBefore(rental.returnAt)
	);
}

function isRentalOrderPastReturn(
	rental: Pick<RentalOrderPeriodAware, "returnAt">,
	referenceDate: Dayjs,
): boolean {
	return (
		referenceDate.isSame(rental.returnAt) ||
		referenceDate.isAfter(rental.returnAt)
	);
}
