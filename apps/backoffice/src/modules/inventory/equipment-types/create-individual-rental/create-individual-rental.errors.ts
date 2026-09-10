import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const genericMessage =
	"No pudimos crear el alquiler individual. Intentá nuevamente.";

const errorMessages = {
	"catalog.invalid_individual_rental":
		"La configuración del alquiler no es válida. Revisá los datos ingresados.",
	"catalog.equipment_type_not_found":
		"El equipo seleccionado ya no está disponible.",
	"catalog.branch_not_found":
		"Una de las sucursales seleccionadas ya no está disponible.",
	"catalog.branch_inactive":
		"Una de las sucursales seleccionadas ya no está activa.",
	"catalog.branch_deleted":
		"Una de las sucursales seleccionadas fue eliminada.",
	"catalog.branch_context_unavailable":
		"No pudimos validar las sucursales. Intentá nuevamente en unos minutos.",
} satisfies Record<string, string>;

export function mapCreateIndividualRentalError(error: unknown): string {
	if (!(error instanceof ProblemDetailsError)) return genericMessage;

	const code = getProblemDetailsCode(error);
	return code && code in errorMessages
		? errorMessages[code as keyof typeof errorMessages]
		: genericMessage;
}
