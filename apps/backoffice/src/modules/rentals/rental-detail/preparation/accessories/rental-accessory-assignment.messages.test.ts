import { describe, expect, it } from "vitest";
import {
	formatAccessoryAvailabilityMessage,
	formatSharedAccessoryAllocationMessage,
	formatSharedAccessoryAvailability,
} from "./rental-accessory-assignment.messages";

describe("formatAccessoryAvailabilityMessage", () => {
	it.each([
		[0, "No hay unidades disponibles para este período."],
		[1, "Solo hay 1 unidad disponible para este período."],
		[2, "Solo hay 2 unidades disponibles para este período."],
	])("formats availability of %i", (availableQuantity, expected) => {
		expect(formatAccessoryAvailabilityMessage(availableQuantity)).toBe(
			expected,
		);
	});
});

describe("formatSharedAccessoryAvailability", () => {
	it.each([
		[1, "1 compartida"],
		[2, "2 compartidas"],
	])("formats shared availability of %i", (capacity, expected) => {
		expect(formatSharedAccessoryAvailability(capacity)).toBe(expected);
	});
});

describe("formatSharedAccessoryAllocationMessage", () => {
	it("identifies one other consuming source", () => {
		expect(
			formatSharedAccessoryAllocationMessage({
				capacity: 1,
				otherSourceEquipmentTypeNames: ["Amaran T2c RGBWW"],
			}),
		).toBe(
			"La unidad disponible ya está asignada a “Amaran T2c RGBWW” en este alquiler. Ajustá esa cantidad si querés usarla acá.",
		);
	});

	it("uses plural wording for a multi-unit pool assigned to one source", () => {
		expect(
			formatSharedAccessoryAllocationMessage({
				capacity: 3,
				otherSourceEquipmentTypeNames: ["Amaran T2c RGBWW"],
			}),
		).toBe(
			"Las 3 unidades disponibles ya están asignadas a “Amaran T2c RGBWW” en este alquiler. Ajustá esa cantidad si querés usarla acá.",
		);
	});

	it("uses the generic fallback for several consuming sources", () => {
		expect(
			formatSharedAccessoryAllocationMessage({
				capacity: 2,
				otherSourceEquipmentTypeNames: ["Amaran T2c RGBWW", "Nanlite FS 300"],
			}),
		).toBe(
			"Las unidades disponibles ya están asignadas a otros equipos de este alquiler. Ajustá esas cantidades si querés usar este accesorio acá.",
		);
	});
});
