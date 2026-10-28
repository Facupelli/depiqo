import {
	getProblemDetailsCode,
	getProblemDetailsStatus,
} from "@/shared/errors";

export type InvoicingErrorKind =
	| "version-conflict"
	| "registration-removed"
	| "rental-ineligible"
	| "invoice-not-found"
	| "rental-not-found"
	| "unauthorized"
	| "forbidden"
	| "validation"
	| "unknown";

export type InvoicingUiError = {
	kind: InvoicingErrorKind;
	message: string;
};

const errorsByCode = {
	"invoicing.invoice_version_conflict": {
		kind: "version-conflict",
		message:
			"El registro de la factura cambió mientras lo editabas. Revisá la información actual antes de volver a intentarlo.",
	},
	"invoicing.invoice_registration_removed": {
		kind: "registration-removed",
		message:
			"Este registro de factura ya fue eliminado de Depiqo. No se puede corregir ni eliminar nuevamente.",
	},
	"invoicing.rental_not_eligible": {
		kind: "rental-ineligible",
		message:
			"Este alquiler no admite el registro de facturas. Se requiere un alquiler confirmado, completado o cancelado después de su confirmación.",
	},
	"invoicing.invoice_not_found": {
		kind: "invoice-not-found",
		message:
			"No encontramos el registro de esta factura. Actualizá la lista para revisar los registros disponibles.",
	},
	"invoicing.rental_not_found": {
		kind: "rental-not-found",
		message:
			"El alquiler ya no está disponible. Actualizá la información antes de registrar una factura.",
	},
	"invoicing.invalid_registration": {
		kind: "validation",
		message:
			"Los datos del registro no son válidos. Revisá los campos e intentá nuevamente.",
	},
} as const satisfies Record<string, InvoicingUiError>;

export function toInvoicingUiError(
	error: unknown,
	fallback = "No pudimos completar la acción. Revisá tu conexión e intentá nuevamente.",
): InvoicingUiError {
	const status = getProblemDetailsStatus(error);
	if (status === 401) {
		return {
			kind: "unauthorized",
			message: "Tu sesión venció. Volvé a iniciar sesión para continuar.",
		};
	}
	if (status === 403) {
		return {
			kind: "forbidden",
			message: "No tenés permiso para realizar esta acción sobre las facturas.",
		};
	}

	const code = getProblemDetailsCode(error);
	if (code && code in errorsByCode) {
		return errorsByCode[code as keyof typeof errorsByCode];
	}

	if (status === 400 || status === 422) {
		return {
			kind: "validation",
			message:
				"Los datos del registro no son válidos. Revisá los campos e intentá nuevamente.",
		};
	}

	return { kind: "unknown", message: fallback };
}
