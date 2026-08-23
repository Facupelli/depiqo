import { ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URI = "https://api.depiqo.com/problems";

const GENERIC_CREATE_ERROR_MESSAGE =
	"No pudimos crear el paquete. Intentá de nuevo.";

const formErrorMessages = {
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.branch_unavailable`]:
		"Una o más sucursales seleccionadas ya no están disponibles. Revisá la selección de sucursales.",
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.equipment_type_not_found`]:
		"Uno de los equipos seleccionados ya no está disponible. Revisá el equipo requerido del paquete.",
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.tenant_unavailable`]:
		"No pudimos crear el paquete. Intentá de nuevo en unos minutos.",
} as const;

export interface CreatePackageSubmissionError {
	message: string;
}

export function mapCreatePackageError(
	error: unknown,
): CreatePackageSubmissionError {
	if (!(error instanceof ProblemDetailsError)) {
		return { message: GENERIC_CREATE_ERROR_MESSAGE };
	}

	return {
		message:
			formErrorMessages[
				error.problemDetails.type as keyof typeof formErrorMessages
			] ?? GENERIC_CREATE_ERROR_MESSAGE,
	};
}
