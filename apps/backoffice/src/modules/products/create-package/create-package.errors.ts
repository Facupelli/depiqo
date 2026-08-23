import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const GENERIC_CREATE_ERROR_MESSAGE =
	"No pudimos crear el paquete. Intentá de nuevo.";

const formErrorMessages = {
	"offering_setup.branch_unavailable":
		"Una o más sucursales seleccionadas ya no están disponibles. Revisá la selección de sucursales.",
	"offering_setup.equipment_type_not_found":
		"Uno de los equipos seleccionados ya no está disponible. Revisá el equipo requerido del paquete.",
	"offering_setup.tenant_unavailable":
		"No pudimos crear el paquete. Intentá de nuevo en unos minutos.",
} satisfies Record<string, string>;

export interface CreatePackageSubmissionError {
	message: string;
}

export function mapCreatePackageError(
	error: unknown,
): CreatePackageSubmissionError {
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
