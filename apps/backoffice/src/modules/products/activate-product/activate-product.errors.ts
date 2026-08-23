import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";

export type ActivateProductUiError = {
	message: string;
	action?: "configure-pricing";
};

const NETWORK_ERROR_MESSAGE = "Ocurrió un error al activar el producto.";

const GENERIC_ACTIVATE_ERROR_MESSAGE = "No pudimos activar el producto.";

const PRICING_BLOCKER_CODE = "catalog.rentable_item_has_no_active_pricing";

const activationErrorMessages = {
	"catalog.rentable_item_not_found":
		"No encontramos este producto. Actualizá la página e intentá de nuevo.",
	"catalog.rentable_item_not_in_draft_status":
		"Solo se pueden activar productos que están en borrador.",
	"catalog.rentable_item_has_no_requirements":
		"Agregá al menos un equipo requerido antes de activar el producto.",
	"catalog.rentable_item_has_no_rental_offers":
		"Agregá al menos una oferta por sucursal antes de activar el producto.",
} satisfies Record<string, string>;

export function getActivateProductError(
	error: unknown,
): ActivateProductUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return { message: NETWORK_ERROR_MESSAGE };
	}

	const code = getProblemDetailsCode(error);

	if (code === PRICING_BLOCKER_CODE) {
		return {
			message: "Asigná un precio antes de activar este producto.",
			action: "configure-pricing",
		};
	}

	if (!code || !(code in activationErrorMessages)) {
		return { message: GENERIC_ACTIVATE_ERROR_MESSAGE };
	}

	return {
		message:
			activationErrorMessages[code as keyof typeof activationErrorMessages],
	};
}
