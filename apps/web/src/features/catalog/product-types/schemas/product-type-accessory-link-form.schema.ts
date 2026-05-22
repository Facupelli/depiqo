import {
	type ReplaceProductTypeAccessoryLinksDto,
	replaceProductTypeAccessoryLinksSchema,
} from "@repo/schemas";
import { z } from "zod";
import { emptyToNull } from "@/shared/utils/form.utils";

export const productTypeAccessoryLinkFormSchema = z.object({
	accessoryRentalItemId: z.string().min(1, "Selecciona un accesorio"),
	isDefaultIncluded: z.boolean(),
	defaultQuantity: z.number().int().positive("Debe ser al menos 1"),
	notes: z.string().or(z.literal("")),
});

export type ProductTypeAccessoryLinkFormValues = z.infer<
	typeof productTypeAccessoryLinkFormSchema
>;

export const productTypeAccessoryLinksFormSchema = z.object({
	accessoryLinks: z
		.array(productTypeAccessoryLinkFormSchema)
		.min(1, "Selecciona al menos un accesorio"),
});

export type ProductTypeAccessoryLinksFormValues = z.infer<
	typeof productTypeAccessoryLinksFormSchema
>;

export const productTypeAccessoryLinkFormDefaults: ProductTypeAccessoryLinkFormValues =
	{
		accessoryRentalItemId: "",
		isDefaultIncluded: false,
		defaultQuantity: 1,
		notes: "",
	};

export const productTypeAccessoryLinksFormDefaults: ProductTypeAccessoryLinksFormValues =
	{
		accessoryLinks: [],
	};

export function toProductTypeAccessoryLinkDto(
	values: ProductTypeAccessoryLinkFormValues,
): ReplaceProductTypeAccessoryLinksDto["accessoryLinks"][number] {
	return {
		accessoryRentalItemId: values.accessoryRentalItemId,
		isDefaultIncluded: values.isDefaultIncluded,
		defaultQuantity: values.defaultQuantity,
		notes: emptyToNull(values.notes),
	};
}

export function toReplaceProductTypeAccessoryLinksDto(
	links: ProductTypeAccessoryLinkFormValues[],
): ReplaceProductTypeAccessoryLinksDto {
	return replaceProductTypeAccessoryLinksSchema.parse({
		accessoryLinks: links.map(toProductTypeAccessoryLinkDto),
	});
}
