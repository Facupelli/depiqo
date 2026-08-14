import {
	type CreateRatePlanBodyDto,
	CreateRatePlanBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const createRatePlanTierFormSchema = z
	.object({
		fromUnit: z
			.number()
			.int("Debe ser un número entero")
			.positive("Debe ser mayor o igual a 1"),
		toUnit: z
			.number()
			.int("Debe ser un número entero")
			.positive("Debe ser mayor o igual a 1")
			.nullable(),
		pricePerUnit: z
			.string()
			.trim()
			.min(1, "El precio es obligatorio")
			.regex(/^\d+(?:\.\d+)?$/, "Ingresa un precio válido"),
	})
	.refine((tier) => tier.toUnit == null || tier.toUnit >= tier.fromUnit, {
		message: "Debe ser mayor o igual al tramo inicial",
		path: ["toUnit"],
	});

export const createRatePlanBaseFormSchema = z.object({
	name: z.string().trim().min(1, "El nombre es obligatorio"),
	billingUnit: z.enum(["HOUR", "DAY", "WEEK"]),
	currency: z
		.string()
		.trim()
		.min(1, "La moneda es obligatoria")
		.regex(/^[A-Za-z]{3}$/, "Usa un código ISO de 3 letras"),
	tiers: z
		.array(createRatePlanTierFormSchema)
		.min(1, "Agrega al menos un tramo de precio"),
});

export const createRatePlanFormSchema = createRatePlanBaseFormSchema.extend({
	isActive: z.boolean(),
});

export type CreateRatePlanTierFormValues = z.infer<
	typeof createRatePlanTierFormSchema
>;
export type CreateRatePlanBaseFormValues = z.infer<
	typeof createRatePlanBaseFormSchema
>;
export type CreateRatePlanFormValues = z.infer<typeof createRatePlanFormSchema>;

export function createEmptyRatePlanTier(): CreateRatePlanTierFormValues {
	return {
		fromUnit: 1,
		toUnit: null,
		pricePerUnit: "",
	};
}

export function createRatePlanBaseFormDefaultValues(): CreateRatePlanBaseFormValues {
	return {
		name: "",
		billingUnit: "DAY",
		currency: "ARS",
		tiers: [createEmptyRatePlanTier()],
	};
}

export function createRatePlanFormDefaultValues(): CreateRatePlanFormValues {
	return {
		...createRatePlanBaseFormDefaultValues(),
		isActive: true,
	};
}

export function toCreateRatePlanDto(
	values: CreateRatePlanFormValues,
): CreateRatePlanBodyDto {
	const dto = {
		name: values.name.trim(),
		billingUnit: values.billingUnit,
		currency: values.currency.trim().toUpperCase(),
		isActive: values.isActive,
		tiers: values.tiers.map((tier) => ({
			fromUnit: tier.fromUnit,
			toUnit: tier.toUnit,
			pricePerUnit: tier.pricePerUnit.trim(),
		})),
	};

	return CreateRatePlanBodySchema.parse(dto);
}
