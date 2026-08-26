import { AssignRentalAccessoriesAvailabilityProblemExtensionsSchema } from "@repo/api-contracts";
import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";
export type AssignRentalAccessoriesUiError = {
	message: string;
	shouldRefreshAvailability: boolean;
	affectedEquipmentTypeId?: string;
};

export function toAssignRentalAccessoriesUiError(
	error: unknown,
): AssignRentalAccessoriesUiError {
	if (!(error instanceof ProblemDetailsError)) {
		return {
			message:
				"No pudimos asignar los accesorios. Revisá tu conexión e intentá nuevamente.",
			shouldRefreshAvailability: false,
		};
	}

	const code = getProblemDetailsCode(error);

	if (code === "rental_commitment.insufficient_asset_availability") {
		const parsed =
			AssignRentalAccessoriesAvailabilityProblemExtensionsSchema.safeParse(
				error.problemDetails,
			);

		if (parsed.success) {
			const { availability } = parsed.data;
			return {
				message:
					"No se pudieron asignar todos los accesorios. Revisá las cantidades marcadas.",
				shouldRefreshAvailability: true,
				affectedEquipmentTypeId: availability.equipmentTypeId,
			};
		}

		return {
			message:
				"No se pudieron asignar todos los accesorios porque el stock cambió. Actualizamos la disponibilidad; revisá las cantidades e intentá nuevamente.",
			shouldRefreshAvailability: true,
		};
	}

	if (code === "rental_commitment.asset_availability_changed") {
		return {
			message:
				"La disponibilidad cambió mientras asignabas los accesorios. Actualizamos el stock; revisá las cantidades e intentá nuevamente.",
			shouldRefreshAvailability: true,
		};
	}

	if (code === "rental_commitment.rental_version_conflict") {
		return {
			message:
				"El pedido cambió mientras asignabas los accesorios. Actualizamos la información; revisá las cantidades e intentá nuevamente.",
			shouldRefreshAvailability: true,
		};
	}

	if (
		code ===
		"rental_commitment.rental_status_does_not_allow_accessory_assignment"
	) {
		return {
			message:
				"El estado actual del pedido no permite asignar accesorios. Actualizá la página e intentá nuevamente.",
			shouldRefreshAvailability: false,
		};
	}

	if (
		code === "rental_commitment.rental_not_found" ||
		code === "rental_commitment.source_rental_demand_line_not_found" ||
		code === "rental_commitment.equipment_type_not_found"
	) {
		return {
			message:
				"No encontramos información actual del pedido para asignar los accesorios. Actualizá la página e intentá nuevamente.",
			shouldRefreshAvailability: false,
		};
	}

	return {
		message: "No pudimos asignar los accesorios. Intentá nuevamente.",
		shouldRefreshAvailability: false,
	};
}
