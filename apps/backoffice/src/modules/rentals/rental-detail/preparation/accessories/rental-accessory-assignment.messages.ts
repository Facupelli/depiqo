export function formatAccessoryAvailabilityMessage(
	availableQuantity: number,
): string {
	if (availableQuantity === 0) {
		return "No hay unidades disponibles para este período.";
	}

	if (availableQuantity === 1) {
		return "Solo hay 1 unidad disponible para este período.";
	}

	return `Solo hay ${availableQuantity} unidades disponibles para este período.`;
}

export function formatSharedAccessoryAvailability(capacity: number): string {
	return `${capacity} ${capacity === 1 ? "compartida" : "compartidas"}`;
}

export function formatSharedAccessoryAllocationMessage({
	capacity,
	otherSourceEquipmentTypeNames,
}: {
	capacity: number;
	otherSourceEquipmentTypeNames: readonly string[];
}): string | undefined {
	if (otherSourceEquipmentTypeNames.length === 0) {
		return undefined;
	}

	if (otherSourceEquipmentTypeNames.length === 1) {
		const assignment =
			capacity === 1
				? "La unidad disponible ya está asignada"
				: `Las ${capacity} unidades disponibles ya están asignadas`;
		return `${assignment} a “${otherSourceEquipmentTypeNames[0]}” en este alquiler. Ajustá esa cantidad si querés usarla acá.`;
	}

	return "Las unidades disponibles ya están asignadas a otros equipos de este alquiler. Ajustá esas cantidades si querés usar este accesorio acá.";
}

export function formatSharedAccessoryPoolConflictMessage(
	capacity: number,
): string {
	const units = capacity === 1 ? "1 unidad" : `${capacity} unidades`;
	return `La disponibilidad de este accesorio cambió. Hay ${units} para repartir entre los equipos de este alquiler. Ajustá las cantidades marcadas e intentá nuevamente.`;
}
