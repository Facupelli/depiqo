import {
	type CreateEquipmentTypeBodyDto,
	CreateEquipmentTypeBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const createEquipmentUnitFormSchema = z.object({
	branchId: z.string().min(1, "La sucursal es obligatoria"),
	ownerId: z.string(),
	serialNumber: z.string(),
	notes: z.string(),
});

export const createEquipmentTypeFormSchema = z.object({
	categoryId: z.string(),
	name: z.string().min(1, "El nombre es obligatorio"),
	description: z.string(),
	units: z.array(createEquipmentUnitFormSchema),
});

export type CreateEquipmentUnitFormValues = z.infer<
	typeof createEquipmentUnitFormSchema
>;
export type CreateEquipmentTypeFormValues = z.infer<
	typeof createEquipmentTypeFormSchema
>;

export function createEmptyEquipmentUnit(): CreateEquipmentUnitFormValues {
	return {
		branchId: "",
		ownerId: "",
		serialNumber: "",
		notes: "",
	};
}

export function createEquipmentTypeFormDefaultValues(): CreateEquipmentTypeFormValues {
	return {
		categoryId: "",
		name: "",
		description: "",
		units: [],
	};
}

export function toCreateEquipmentTypeDto(
	values: CreateEquipmentTypeFormValues,
): CreateEquipmentTypeBodyDto {
	const dto = {
		name: values.name.trim(),
		categoryId: emptyToNull(values.categoryId),
		description: emptyToNull(values.description),
		assets: values.units.map((unit) => ({
			branchId: unit.branchId,
			ownerId: emptyToNull(unit.ownerId),
			serialNumber: emptyToNull(unit.serialNumber),
			notes: emptyToNull(unit.notes),
		})),
	};

	return CreateEquipmentTypeBodySchema.parse(dto);
}
