import {
	type CreateRentableEquipmentBodyDto,
	CreateRentableEquipmentBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const createProductUnitFormSchema = z.object({
	branchId: z.string().min(1, "La sucursal es obligatoria"),
	serialNumber: z.string(),
	notes: z.string(),
	ownerId: z.string(),
});

export const createProductFormSchema = z.object({
	categoryId: z.string(),
	name: z.string().min(1, "El nombre es obligatorio"),
	imageUrl: z.string(),
	description: z.string(),
	quantityPerItem: z.number().int().positive("Debe ser mayor o igual a 1"),
	units: z.array(createProductUnitFormSchema),
});

export type CreateProductUnitFormValues = z.infer<
	typeof createProductUnitFormSchema
>;
export type CreateProductFormValues = z.infer<typeof createProductFormSchema>;

export function createEmptyProductUnit(): CreateProductUnitFormValues {
	return {
		branchId: "",
		serialNumber: "",
		notes: "",
		ownerId: "",
	};
}

export function createProductFormDefaultValues(): CreateProductFormValues {
	return {
		categoryId: "",
		name: "",
		imageUrl: "",
		description: "",
		quantityPerItem: 1,
		units: [],
	};
}

export function toCreateProductDto(
	values: CreateProductFormValues,
): CreateRentableEquipmentBodyDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
		imageUrl: emptyToNull(values.imageUrl),
		categoryId: emptyToNull(values.categoryId),
		kind: "SINGLE" as const,
		quantityPerItem: 1,
		assets: values.units.map((unit) => ({
			branchId: unit.branchId,
			serialNumber: emptyToNull(unit.serialNumber),
			notes: emptyToNull(unit.notes),
			ownerId: emptyToNull(unit.ownerId),
		})),
	};

	return CreateRentableEquipmentBodySchema.parse(dto);
}
