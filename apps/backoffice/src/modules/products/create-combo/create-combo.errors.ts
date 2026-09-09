import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const GENERIC_CREATE_ERROR_MESSAGE =
	"No pudimos crear el combo. Intentá de nuevo.";

const formErrorMessages = {
	"offering_setup.branch_unavailable":
		"Una o más sucursales seleccionadas ya no están disponibles. Revisá la selección de sucursales.",
	"offering_setup.equipment_type_not_found":
		"Uno de los equipos seleccionados ya no está disponible. Revisá los equipos del combo.",
	"offering_setup.invalid_package":
		"La configuración del combo no es válida. Revisá los equipos y las sucursales seleccionadas.",
	"offering_setup.tenant_unavailable":
		"No pudimos crear el combo. Intentá de nuevo en unos minutos.",
} satisfies Record<string, string>;

export interface CreateComboSubmissionError {
	message: string;
}

export function mapCreateComboError(
	error: unknown,
): CreateComboSubmissionError {
	if (!(error instanceof ProblemDetailsError)) {
		return { message: GENERIC_CREATE_ERROR_MESSAGE };
	}

	const code = getProblemDetailsCode(error);

	return {
		message:
			code && code in formErrorMessages
				? formErrorMessages[code as keyof typeof formErrorMessages]
				: GENERIC_CREATE_ERROR_MESSAGE,
	};
}
