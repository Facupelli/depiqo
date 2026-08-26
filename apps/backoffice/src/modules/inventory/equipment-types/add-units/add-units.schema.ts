import {
	type AddAssetsToEquipmentTypeBodyDto,
	AddAssetsToEquipmentTypeBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const addEquipmentUnitFormSchema = z.object({
	branchId: z.string().min(1, "La sucursal es obligatoria"),
	ownerId: z.string(),
	serialNumber: z.string(),
	notes: z.string(),
});

export const addUnitsFormSchema = z.object({
	units: z
		.array(addEquipmentUnitFormSchema)
		.min(1, "Agrega al menos una unidad"),
});

export type AddEquipmentUnitFormValues = z.infer<
	typeof addEquipmentUnitFormSchema
>;
export type AddUnitsFormValues = z.infer<typeof addUnitsFormSchema>;

export function createEmptyEquipmentUnit(): AddEquipmentUnitFormValues {
	return {
		branchId: "",
		ownerId: "",
		serialNumber: "",
		notes: "",
	};
}

export function addUnitsFormDefaultValues(): AddUnitsFormValues {
	return {
		units: [createEmptyEquipmentUnit()],
	};
}

export function toAddUnitsToEquipmentTypeDto(
	values: AddUnitsFormValues,
): AddAssetsToEquipmentTypeBodyDto {
	const dto = {
		assets: values.units.map((unit) => ({
			branchId: unit.branchId,
			ownerId: emptyToNull(unit.ownerId),
			serialNumber: emptyToNull(unit.serialNumber),
			notes: emptyToNull(unit.notes),
		})),
	};

	return AddAssetsToEquipmentTypeBodySchema.parse(dto);
}
