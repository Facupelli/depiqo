import type { GetRentalContractSigningSummaryResponseDto } from "@repo/api-contracts";
import { formatTimestampInTimezone } from "@/lib/dates/format";

export type RentalContractSigningStateTone =
	| "neutral"
	| "warning"
	| "success"
	| "danger"
	| "info";

export type RentalContractSigningState = {
	label: string;
	description: string;
	tone: RentalContractSigningStateTone;
	activityAt: string | null;
};

export function getRentalContractSigningState(
	summary: GetRentalContractSigningSummaryResponseDto,
): RentalContractSigningState {
	const request = summary.latestSigningRequest;

	if (summary.contractStatus === "SIGNED" || summary.acceptance) {
		return {
			label: "Contrato firmado",
			description: "La aceptación quedó registrada correctamente.",
			tone: "success",
			activityAt: summary.acceptance?.acceptedAt ?? request?.signedAt ?? null,
		};
	}

	if (request?.status === "FAILED") {
		return {
			label: "Firma no completada",
			description: "El envío falló y requiere una nueva invitación.",
			tone: "danger",
			activityAt: request.failedAt,
		};
	}

	if (request?.status === "CANCELLED") {
		return {
			label: "Solicitud cancelada",
			description: "La solicitud anterior ya no está disponible.",
			tone: "neutral",
			activityAt: request.cancelledAt,
		};
	}

	if (request?.status === "EXPIRED") {
		return {
			label: "Solicitud vencida",
			description: "La solicitud expiró y requiere un nuevo envío.",
			tone: "danger",
			activityAt: request.expiresAt,
		};
	}

	if (summary.contractStatus === "RESIGN_REQUIRED") {
		return {
			label: "Requiere nueva firma",
			description: "El contrato cambió y debe enviarse nuevamente.",
			tone: "warning",
			activityAt: request?.sentAt ?? null,
		};
	}

	if (summary.contractStatus === "VOID") {
		return {
			label: "Contrato anulado",
			description: "Este contrato ya no está disponible para firma.",
			tone: "neutral",
			activityAt: request?.cancelledAt ?? request?.failedAt ?? null,
		};
	}

	if (request) {
		return {
			label:
				request.status === "VIEWED" ? "Solicitud vista" : "Firma solicitada",
			description:
				request.status === "VIEWED"
					? "El cliente abrió la solicitud y aún no firmó."
					: "La invitación fue enviada y espera la firma del cliente.",
			tone: "info",
			activityAt: request.viewedAt ?? request.sentAt ?? null,
		};
	}

	if (
		summary.contractStatus === "DRAFT" ||
		summary.contractStatus === "GENERATED"
	) {
		return {
			label: "Contrato preparado",
			description: "El contrato existe, pero todavía no se envió a firmar.",
			tone: "warning",
			activityAt: null,
		};
	}

	return {
		label: "Pendiente de envío",
		description: "Todavía no se envió la invitación de firma.",
		tone: "warning",
		activityAt: null,
	};
}

export function getRentalContractSigningToneClasses(
	tone: RentalContractSigningStateTone,
) {
	switch (tone) {
		case "success":
			return {
				iconWrapClassName: "bg-emerald-100 text-emerald-700",
				iconClassName: "text-emerald-700",
			};
		case "danger":
			return {
				iconWrapClassName: "bg-red-100 text-red-700",
				iconClassName: "text-red-700",
			};
		case "info":
			return {
				iconWrapClassName: "bg-blue-100 text-blue-700",
				iconClassName: "text-blue-700",
			};
		case "warning":
			return {
				iconWrapClassName: "bg-amber-100 text-amber-700",
				iconClassName: "text-amber-700",
			};
		case "neutral":
			return {
				iconWrapClassName: "bg-neutral-100 text-neutral-600",
				iconClassName: "text-neutral-600",
			};
	}
}

export function formatRentalContractSigningDate(
	value: string | null,
	timezone: string,
) {
	return value
		? formatTimestampInTimezone(value, timezone, "DD MMM, YYYY · HH:mm")
		: "Sin registro";
}
