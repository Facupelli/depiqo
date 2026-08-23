import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const GENERIC_CREATE_ERROR_MESSAGE =
	"No pudimos crear el producto. Intentá de nuevo.";

const DUPLICATE_NAME_CODE = "offering_setup.duplicate_equipment_type_name";

const formErrorMessages = {
	"offering_setup.branch_unavailable":
		"Una o más sucursales seleccionadas ya no están disponibles. Revisá las unidades del producto.",
	"offering_setup.asset_owner_not_found":
		"Uno o más dueños seleccionados ya no existen. Revisá las unidades del producto.",
	"offering_setup.active_owner_contract_not_found":
		"Un dueño seleccionado no tiene contrato activo. Revisá las unidades del producto.",
	"offering_setup.multiple_active_owner_contracts":
		"Un dueño seleccionado tiene múltiples contratos activos. Revisá las unidades del producto.",
	"offering_setup.tenant_unavailable":
		"No pudimos crear el producto. Intentá de nuevo en unos minutos.",
} satisfies Record<string, string>;

export type CreateProductSubmissionError =
	| { kind: "field"; field: "name"; message: string }
	| { kind: "form"; message: string };

export function mapCreateProductError(
	error: unknown,
): CreateProductSubmissionError {
	if (!(error instanceof ProblemDetailsError)) {
		return { kind: "form", message: GENERIC_CREATE_ERROR_MESSAGE };
	}

	const code = getProblemDetailsCode(error);

	if (code === DUPLICATE_NAME_CODE) {
		return {
			kind: "field",
			field: "name",
			message: "Ya existe un producto con este nombre. Elegí otro nombre.",
		};
	}

	return {
		kind: "form",
		message:
			code && code in formErrorMessages
				? formErrorMessages[code as keyof typeof formErrorMessages]
				: GENERIC_CREATE_ERROR_MESSAGE,
	};
}
