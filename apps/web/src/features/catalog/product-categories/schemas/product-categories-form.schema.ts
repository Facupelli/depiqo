import {
	type CreateProductCategoryDto,
	createProductCategorySchema,
	type UpdateProductCategoryDto,
	updateProductCategorySchema,
} from "@repo/schemas";
import { z } from "zod";
import { emptyToNull, emptyToNullOrUndefined } from "@/shared/utils/form.utils";

export const productCategoryFormSchema = z.object({
	name: z.string().min(1, "Name is required"),
	description: z.string().or(z.literal("")),
});

export type ProductCategoryFormValues = z.infer<
	typeof productCategoryFormSchema
>;

export const productCategoryFormDefaults: ProductCategoryFormValues = {
	name: "",
	description: "",
};

export function productCategoryToFormValues(category: {
	name: string;
	description: string | null;
}): ProductCategoryFormValues {
	return {
		name: category.name,
		description: category.description ?? "",
	};
}

export function toCreateProductCategoryDto(
	values: ProductCategoryFormValues,
): CreateProductCategoryDto {
	const dto = {
		name: values.name.trim(),
		description: emptyToNull(values.description),
	};

	return createProductCategorySchema.parse(dto);
}

export function toUpdateProductCategoryDto(
	dirtyValues: Partial<ProductCategoryFormValues>,
): UpdateProductCategoryDto {
	const dto: UpdateProductCategoryDto = {};

	if (dirtyValues.name !== undefined) {
		dto.name = dirtyValues.name.trim();
	}
	if (dirtyValues.description !== undefined) {
		dto.description = emptyToNullOrUndefined(dirtyValues.description);
	}

	return updateProductCategorySchema.parse(dto);
}
