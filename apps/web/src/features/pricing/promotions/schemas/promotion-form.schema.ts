import {
	type CreatePromotionBodyDto,
	CreatePromotionBodySchema,
	type CreatePromotionExclusionDto,
	type CreatePromotionScopeDto,
	type GetPromotionsPromotionDto,
	type UpdatePromotionBodyDto,
	UpdatePromotionBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

const requiredUuidSchema = z.uuid("Ingresa un UUID valido");
const decimalInputSchema = z
	.string()
	.trim()
	.regex(/^\d+(?:\.\d+)?$/, "Ingresa un monto valido");
const optionalDecimalInputSchema = z
	.string()
	.trim()
	.refine((value) => value === "" || /^\d+(?:\.\d+)?$/.test(value), {
		message: "Ingresa un monto valido",
	});
const optionalPositiveIntegerInputSchema = z
	.string()
	.trim()
	.refine((value) => value === "" || /^\d+$/.test(value), {
		message: "Ingresa un numero entero valido",
	})
	.refine((value) => value === "" || Number(value) > 0, {
		message: "El valor debe ser mayor a 0",
	});

export const promotionScopeFormSchema = z.discriminatedUnion("type", [
	z.object({ type: z.literal("ALL") }),
	z.object({
		type: z.literal("RENTABLE_ITEM"),
		rentableItemId: requiredUuidSchema,
	}),
	z.object({
		type: z.literal("RENTAL_OFFER"),
		rentalOfferId: requiredUuidSchema,
	}),
	z.object({ type: z.literal("CATEGORY"), categoryId: requiredUuidSchema }),
]);

export const promotionExclusionFormSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("RENTABLE_ITEM"),
		rentableItemId: requiredUuidSchema,
	}),
	z.object({
		type: z.literal("RENTAL_OFFER"),
		rentalOfferId: requiredUuidSchema,
	}),
	z.object({ type: z.literal("CATEGORY"), categoryId: requiredUuidSchema }),
]);

export const promotionFormSchema = z
	.object({
		name: z.string().trim().min(1, "El nombre es obligatorio"),
		activation: z.enum(["AUTOMATIC", "COUPON_REQUIRED"]),
		priority: z.number().int().min(0, "La prioridad debe ser 0 o mayor"),
		stackable: z.boolean(),
		isActive: z.boolean(),
		validFrom: z.string(),
		validUntil: z.string(),
		effectType: z.enum(["PERCENTAGE_OFF", "FIXED_AMOUNT_OFF"]),
		effectValue: decimalInputSchema,
		target: z.enum(["ORDER", "ELIGIBLE_LINES"]),
		minOrderSubtotal: optionalDecimalInputSchema,
		minRentalUnits: optionalPositiveIntegerInputSchema,
		maxRentalUnits: optionalPositiveIntegerInputSchema,
		scopes: z
			.array(promotionScopeFormSchema)
			.min(1, "Agrega al menos un alcance"),
		exclusions: z.array(promotionExclusionFormSchema),
	})
	.superRefine((data, ctx) => {
		if (
			data.validFrom &&
			data.validUntil &&
			data.validFrom >= data.validUntil
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["validUntil"],
				message: "La fecha hasta debe ser posterior a la fecha desde",
			});
		}

		if (
			data.minRentalUnits &&
			data.maxRentalUnits &&
			Number(data.minRentalUnits) > Number(data.maxRentalUnits)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["maxRentalUnits"],
				message: "El maximo debe ser mayor o igual al minimo",
			});
		}
	});

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;
export type PromotionScopeFormValues = PromotionFormValues["scopes"][number];
export type PromotionExclusionFormValues =
	PromotionFormValues["exclusions"][number];
export type PromotionScopeType = PromotionScopeFormValues["type"];
export type PromotionExclusionType = PromotionExclusionFormValues["type"];

export function createEmptyScope(
	type: PromotionScopeType,
): PromotionScopeFormValues {
	switch (type) {
		case "ALL":
			return { type };
		case "RENTABLE_ITEM":
			return { type, rentableItemId: "" };
		case "RENTAL_OFFER":
			return { type, rentalOfferId: "" };
		case "CATEGORY":
			return { type, categoryId: "" };
		default:
			return assertNever(type);
	}
}

export function createEmptyExclusion(
	type: PromotionExclusionType,
): PromotionExclusionFormValues {
	switch (type) {
		case "RENTABLE_ITEM":
			return { type, rentableItemId: "" };
		case "RENTAL_OFFER":
			return { type, rentalOfferId: "" };
		case "CATEGORY":
			return { type, categoryId: "" };
		default:
			return assertNever(type);
	}
}

export function createPromotionFormDefaultValues(): PromotionFormValues {
	return {
		name: "",
		activation: "AUTOMATIC",
		priority: 0,
		stackable: false,
		isActive: true,
		validFrom: "",
		validUntil: "",
		effectType: "PERCENTAGE_OFF",
		effectValue: "10",
		target: "ORDER",
		minOrderSubtotal: "",
		minRentalUnits: "",
		maxRentalUnits: "",
		scopes: [createEmptyScope("ALL")],
		exclusions: [],
	};
}

export function toCreatePromotionDto(
	values: PromotionFormValues,
): CreatePromotionBodyDto {
	return CreatePromotionBodySchema.parse(toPromotionBody(values));
}

export function toUpdatePromotionDto(
	values: PromotionFormValues,
): UpdatePromotionBodyDto {
	return UpdatePromotionBodySchema.parse(toPromotionBody(values));
}

export function promotionToFormValues(
	promotion: GetPromotionsPromotionDto,
): PromotionFormValues {
	return {
		name: promotion.name,
		activation: promotion.activation,
		priority: promotion.priority,
		stackable: promotion.stackable,
		isActive: promotion.isActive,
		validFrom: toDateInputValue(promotion.validFrom),
		validUntil: toDateInputValue(promotion.validUntil),
		effectType: promotion.effectType,
		effectValue: promotion.effectValue,
		target: promotion.target,
		minOrderSubtotal: promotion.minOrderSubtotal ?? "",
		minRentalUnits: promotion.minRentalUnits?.toString() ?? "",
		maxRentalUnits: promotion.maxRentalUnits?.toString() ?? "",
		scopes: promotion.scopes,
		exclusions: promotion.exclusions,
	};
}

function toPromotionBody(values: PromotionFormValues) {
	return {
		name: values.name.trim(),
		activation: values.activation,
		priority: values.priority,
		stackable: values.stackable,
		isActive: values.isActive,
		validFrom: toOptionalDateTime(values.validFrom),
		validUntil: toOptionalDateTime(values.validUntil),
		effectType: values.effectType,
		effectValue: values.effectValue.trim(),
		target: values.target,
		minOrderSubtotal: emptyToUndefined(values.minOrderSubtotal),
		minRentalUnits: stringToOptionalNumber(values.minRentalUnits),
		maxRentalUnits: stringToOptionalNumber(values.maxRentalUnits),
		scopes: values.scopes as CreatePromotionScopeDto[],
		exclusions: values.exclusions as CreatePromotionExclusionDto[],
	};
}

function emptyToUndefined(value: string): string | undefined {
	const trimmed = value.trim();
	return trimmed === "" ? undefined : trimmed;
}

function stringToOptionalNumber(value: string): number | undefined {
	const trimmed = value.trim();
	return trimmed === "" ? undefined : Number(trimmed);
}

function toOptionalDateTime(value: string): string | undefined {
	if (!value.trim()) {
		return undefined;
	}

	return new Date(value).toISOString();
}

function toDateInputValue(value: string | null): string {
	if (!value) {
		return "";
	}

	return new Date(value).toISOString().slice(0, 10);
}

function assertNever(value: never): never {
	throw new Error(`Unhandled promotion variant: ${value}`);
}
