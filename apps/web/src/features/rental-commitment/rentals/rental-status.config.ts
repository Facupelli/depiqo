import type { GetRentalsStatusDto } from "@repo/api-contracts";

export type RentalStatusConfig = { label: string; className: string };

export const RENTAL_STATUS_CONFIG: Record<GetRentalsStatusDto, RentalStatusConfig> = {
	DRAFT: {
		label: "Borrador",
		className: "bg-stone-100 text-stone-700 ring-1 ring-stone-200",
	},
	PENDING: {
		label: "Pendiente Revisión",
		className: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
	},
	CONFIRMED: {
		label: "Confirmado",
		className: "bg-blue-50 text-blue-700 ring-1 ring-blue-200",
	},
	PREPARED: {
		label: "Preparado",
		className: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
	},
	COMPLETED: {
		label: "Completado",
		className: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
	},
	CANCELLED: {
		label: "Cancelado",
		className: "bg-red-50 text-red-600 ring-1 ring-red-200",
	},
};
