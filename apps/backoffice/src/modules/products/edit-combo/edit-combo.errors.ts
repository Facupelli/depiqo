import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

const GENERIC_UPDATE_ERROR_MESSAGE =
	"No pudimos guardar los cambios del combo. Intentá nuevamente.";

const formErrorMessages = {
	"catalog.rentable_item_not_found":
		"El combo ya no existe o dejó de estar disponible.",
	"catalog.rentable_item_archived":
		"El combo fue archivado mientras lo editabas y ya no puede modificarse.",
	"catalog.category_not_found":
		"La categoría seleccionada ya no está disponible. Elegí otra categoría.",
	"catalog.category_inactive":
		"La categoría seleccionada ya no está disponible. Elegí otra categoría.",
	"catalog.equipment_type_not_found":
		"Uno de los equipos seleccionados ya no existe. Revisá los equipos del combo.",
	"catalog.rentable_item_invalid_definition":
		"La definición del combo no es válida. Revisá los equipos y sus cantidades.",
} satisfies Record<string, string>;

export interface EditComboSubmissionError {
	message: string;
}

export function mapEditComboError(error: unknown): EditComboSubmissionError {
	if (!(error instanceof ProblemDetailsError)) {
		return { message: GENERIC_UPDATE_ERROR_MESSAGE };
	}

	const code = getProblemDetailsCode(error);
	return {
		message:
			code && code in formErrorMessages
				? formErrorMessages[code as keyof typeof formErrorMessages]
				: GENERIC_UPDATE_ERROR_MESSAGE,
	};
}
