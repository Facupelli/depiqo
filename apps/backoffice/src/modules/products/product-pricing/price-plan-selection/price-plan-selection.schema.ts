import { z } from "zod";

export const pricePlanSelectionFormSchema = z.object({
	ratePlanId: z.string().trim().min(1, "El plan de tarifa es obligatorio"),
});

export type PricePlanSelectionFormValues = z.infer<
	typeof pricePlanSelectionFormSchema
>;

export function pricePlanSelectionFormDefaultValues(): PricePlanSelectionFormValues {
	return {
		ratePlanId: "",
	};
}
