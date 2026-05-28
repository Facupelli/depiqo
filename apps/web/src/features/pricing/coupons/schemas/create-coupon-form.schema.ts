import { type CreateCouponDto, createCouponSchema } from "@repo/schemas";
import { z } from "zod";

export const couponFormSchema = z.object({
	code: z.string().min(1, "El código es requerido"),
	promotionId: z.uuid("Selecciona una promocion"),
	maxUses: z.string().or(z.literal("")),
	maxUsesPerCustomer: z.string().or(z.literal("")),
	restrictedToCustomerId: z.string().or(z.literal("")),
	validFrom: z.string().or(z.literal("")),
	validUntil: z.string().or(z.literal("")),
});

export type CouponFormValues = z.infer<typeof couponFormSchema>;

export const couponFormDefaults: CouponFormValues = {
	code: "",
	promotionId: "",
	maxUses: "",
	maxUsesPerCustomer: "",
	restrictedToCustomerId: "",
	validFrom: "",
	validUntil: "",
};

export function toCreateCouponDto(values: CouponFormValues): CreateCouponDto {
	const maxUses = values.maxUses ? parseInt(values.maxUses, 10) : undefined;
	const maxUsesPerCustomer = values.maxUsesPerCustomer
		? parseInt(values.maxUsesPerCustomer, 10)
		: undefined;

	const dto = {
		code: values.code.trim().toUpperCase(),
		promotionId: values.promotionId,
		maxUses,
		maxUsesPerCustomer,
		restrictedToCustomerId: values.restrictedToCustomerId || undefined,
		validFrom: values.validFrom ? new Date(values.validFrom) : undefined,
		validUntil: values.validUntil ? new Date(values.validUntil) : undefined,
	};

	return createCouponSchema.parse(dto);
}
