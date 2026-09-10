import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const genericMessage = "No pudimos crear el equipo. Intentá de nuevo.";

const messages = {
	"offering_setup.tenant_unavailable":
		"No pudimos acceder a tu organización. Intentá de nuevo en unos minutos.",
	"offering_setup.branch_unavailable":
		"Una o más sucursales seleccionadas ya no están disponibles. Revisá las unidades y la disponibilidad comercial.",
	"offering_setup.invalid_equipment":
		"Los datos del equipo no son válidos. Revisalos antes de continuar.",
	"offering_setup.asset_owner_not_found":
		"Uno o más propietarios seleccionados ya no existen. Revisá las unidades.",
	"offering_setup.active_owner_contract_not_found":
		"Un propietario seleccionado no tiene un contrato activo. Revisá las unidades.",
	"offering_setup.multiple_active_owner_contracts":
		"Un propietario seleccionado tiene múltiples contratos activos. Revisá las unidades.",
	"offering_setup.invalid_standalone_rental":
		"La configuración de alquiler individual no es válida. Revisá sus datos.",
} satisfies Record<string, string>;

export type CreateEquipmentSubmissionError =
	| { kind: "field"; field: "equipment.name"; message: string }
	| { kind: "form"; message: string };

export function mapCreateEquipmentError(
	error: unknown,
): CreateEquipmentSubmissionError {
	if (!(error instanceof ProblemDetailsError)) {
		return { kind: "form", message: genericMessage };
	}

	const code = getProblemDetailsCode(error);
	if (code === "offering_setup.duplicate_equipment_type_name") {
		return {
			kind: "field",
			field: "equipment.name",
			message: "Ya existe un equipo con este nombre. Elegí otro nombre.",
		};
	}

	return {
		kind: "form",
		message:
			code && code in messages
				? messages[code as keyof typeof messages]
				: genericMessage,
	};
}
