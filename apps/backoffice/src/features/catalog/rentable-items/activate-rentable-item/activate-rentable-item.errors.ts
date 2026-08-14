import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { ProblemDetailsError } from "@/shared/errors";

const PROBLEM_TYPE_BASE_URI = "https://api.depiqo.com/problems";

const activationErrorMessages = {
	[`${PROBLEM_TYPE_BASE_URI}/catalog/rentable-item-not-found`]:
		"No encontramos el ítem rentable que querés activar.",
	[`${PROBLEM_TYPE_BASE_URI}/catalog/rentable-item-not-in-draft-status`]:
		"Solo se pueden activar ítems que están en borrador.",
	[`${PROBLEM_TYPE_BASE_URI}/catalog/rentable-item-has-no-requirements`]:
		"Agregá al menos un equipo requerido antes de activar el ítem.",
	[`${PROBLEM_TYPE_BASE_URI}/catalog/rentable-item-has-no-rental-offers`]:
		"Agregá al menos una oferta por sucursal antes de activar el ítem.",
	[`${PROBLEM_TYPE_BASE_URI}/catalog/rentable-item-has-no-active-pricing`]:
		"Asigná un plan de precios activo a una oferta antes de activar el ítem.",
} as const;

const insufficientActiveAssetsProblemType = `${PROBLEM_TYPE_BASE_URI}/catalog/rentable-item-has-insufficient-active-assets`;

type ActivationErrorContext = {
	equipmentTypeId: string;
	requiredQuantity: number;
	activeAssetCount: number;
};

export function getActivateRentableItemErrorMessage(
	error: unknown,
	item: GetRentableItemDetailResponseDto,
): string {
	if (!(error instanceof ProblemDetailsError)) {
		return "Ocurrió un error al activar el ítem rentable.";
	}

	if (error.problemDetails.type === insufficientActiveAssetsProblemType) {
		const context = getInsufficientActiveAssetsContext(error.problemDetails);

		if (context) {
			const equipment = item.requiredEquipment.find(
				(requirement) =>
					requirement.equipmentTypeId === context.equipmentTypeId,
			);
			const equipmentName =
				equipment?.equipmentTypeName ?? "este tipo de equipo";

			return `No se puede activar el ítem porque no hay suficientes equipos activos de ${equipmentName}: se requieren ${context.requiredQuantity} y hay ${context.activeAssetCount}.`;
		}

		return "No se puede activar el ítem porque no hay suficientes equipos activos para completar sus requisitos.";
	}

	return (
		activationErrorMessages[
			error.problemDetails.type as keyof typeof activationErrorMessages
		] ?? "No pudimos activar el ítem rentable."
	);
}

function getInsufficientActiveAssetsContext(
	problemDetails: Record<string, unknown>,
): ActivationErrorContext | null {
	const { equipmentTypeId, requiredQuantity, activeAssetCount } =
		problemDetails;

	if (
		typeof equipmentTypeId !== "string" ||
		!isNonNegativeInteger(requiredQuantity) ||
		!isNonNegativeInteger(activeAssetCount)
	) {
		return null;
	}

	return { equipmentTypeId, requiredQuantity, activeAssetCount };
}

function isNonNegativeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 0;
}
