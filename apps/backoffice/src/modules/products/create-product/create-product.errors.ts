import { ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URI = "https://api.depiqo.com/problems";

const GENERIC_CREATE_ERROR_MESSAGE =
	"No pudimos crear el producto. Intentá de nuevo.";

const duplicateNameProblemType = `${PROBLEM_TYPE_BASE_URI}/offering_setup.duplicate_equipment_type_name`;

const formErrorMessages = {
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.branch_unavailable`]:
		"Una o más sucursales seleccionadas ya no están disponibles. Revisá las unidades del producto.",
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.asset_owner_not_found`]:
		"Uno o más dueños seleccionados ya no existen. Revisá las unidades del producto.",
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.active_owner_contract_not_found`]:
		"Un dueño seleccionado no tiene contrato activo. Revisá las unidades del producto.",
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.multiple_active_owner_contracts`]:
		"Un dueño seleccionado tiene múltiples contratos activos. Revisá las unidades del producto.",
	[`${PROBLEM_TYPE_BASE_URI}/offering_setup.tenant_unavailable`]:
		"No pudimos crear el producto. Intentá de nuevo en unos minutos.",
} as const;

export type CreateProductSubmissionError =
	| { kind: "field"; field: "name"; message: string }
	| { kind: "form"; message: string };

export function mapCreateProductError(
	error: unknown,
): CreateProductSubmissionError {
	if (!(error instanceof ProblemDetailsError)) {
		return { kind: "form", message: GENERIC_CREATE_ERROR_MESSAGE };
	}

	if (error.problemDetails.type === duplicateNameProblemType) {
		return {
			kind: "field",
			field: "name",
			message: "Ya existe un producto con este nombre. Elegí otro nombre.",
		};
	}

	return {
		kind: "form",
		message:
			formErrorMessages[
				error.problemDetails.type as keyof typeof formErrorMessages
			] ?? GENERIC_CREATE_ERROR_MESSAGE,
	};
}
