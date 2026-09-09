import { z } from "zod";

export const comboRequirementFormSchema = z.object({
	equipmentTypeId: z.string().min(1, "El equipo es obligatorio"),
	equipmentTypeName: z.string().min(1),
	quantityPerItem: z
		.number()
		.int("Debe ser un número entero")
		.positive("Debe ser mayor o igual a 1"),
});

export const comboRequirementsFormSchema = z
	.array(comboRequirementFormSchema)
	.min(1, "Agrega al menos un equipo al combo")
	.refine(
		(requirements) =>
			new Set(requirements.map((item) => item.equipmentTypeId)).size ===
			requirements.length,
		"Cada equipo puede agregarse una sola vez",
	);

export type ComboRequirementFormValues = z.infer<
	typeof comboRequirementFormSchema
>;
