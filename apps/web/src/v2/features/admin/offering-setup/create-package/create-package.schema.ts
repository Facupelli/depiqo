import {
	type CreatePackageBodyDto,
	CreatePackageBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const createPackageRequirementFormSchema = z.object({
	equipmentTypeId: z.string().min(1, "El equipo es obligatorio"),
	equipmentTypeName: z.string().min(1),
	quantityPerItem: z
		.number()
		.int("Debe ser un número entero")
		.positive("Debe ser mayor o igual a 1"),
});

export const createPackageFormSchema = z.object({
	categoryId: z.string().or(z.literal("")),
	name: z.string().min(1, "El nombre es obligatorio"),
	imageUrl: z.string().or(z.literal("")),
	description: z.string().or(z.literal("")),
	branchIds: z
		.array(z.string().min(1))
		.min(1, "Selecciona al menos una sucursal"),
	requirements: z
		.array(createPackageRequirementFormSchema)
		.min(1, "Agrega al menos un equipo al combo")
		.refine(
			(requirements) =>
				new Set(requirements.map((requirement) => requirement.equipmentTypeId))
					.size === requirements.length,
			"Cada equipo puede agregarse una sola vez",
		),
});

export type CreatePackageRequirementFormValues = z.infer<
	typeof createPackageRequirementFormSchema
>;
export type CreatePackageFormValues = z.infer<typeof createPackageFormSchema>;

export const createPackageFormDefaults: CreatePackageFormValues = {
	categoryId: "",
	name: "",
	imageUrl: "",
	description: "",
	branchIds: [],
	requirements: [],
};

export function toCreatePackageDto(
	values: CreatePackageFormValues,
): CreatePackageBodyDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
		imageUrl: emptyToNull(values.imageUrl),
		categoryId: emptyToNull(values.categoryId),
		branchIds: values.branchIds,
		requirements: values.requirements.map((requirement) => ({
			equipmentTypeId: requirement.equipmentTypeId,
			quantityPerItem: requirement.quantityPerItem,
		})),
	};

	return CreatePackageBodySchema.parse(dto);
}
