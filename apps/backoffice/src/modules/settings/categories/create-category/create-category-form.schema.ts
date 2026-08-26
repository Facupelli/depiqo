import { CreateCategoryBodySchema } from "@repo/api-contracts";
import { z } from "zod";

export const createCategoryFormSchema = z.object({
	name: z.string().trim().min(1, "El nombre es requerido"),
	sortOrder: z.number().int("El orden debe ser un número entero"),
});

export type CreateCategoryFormValues = z.infer<typeof createCategoryFormSchema>;

export const createCategoryFormDefaults: CreateCategoryFormValues = {
	name: "",
	sortOrder: 0,
};

export function toCreateCategoryDto(values: CreateCategoryFormValues) {
	return CreateCategoryBodySchema.parse({
		name: values.name.trim(),
		sortOrder: values.sortOrder,
	});
}
