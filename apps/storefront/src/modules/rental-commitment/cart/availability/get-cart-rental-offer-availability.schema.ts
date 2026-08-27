import { z } from "zod";

export const GetCartRentalOfferAvailabilityInputSchema = z.object({
	branchId: z.string().trim().min(1),
	periodStart: z.iso.date(),
	periodEnd: z.iso.date(),
	rentalOfferIds: z
		.array(z.string().trim().min(1))
		.min(1)
		.refine((ids) => new Set(ids).size === ids.length, {
			message: "rentalOfferIds must not contain duplicates",
		}),
});

export type GetCartRentalOfferAvailabilityInput = z.infer<
	typeof GetCartRentalOfferAvailabilityInputSchema
>;

export const GetCartRentalOfferAvailabilityResponseSchema = z.object({
	data: z.array(
		z.object({
			rentalOfferId: z.string(),
			availableCount: z.number().int().nonnegative(),
		}),
	),
});

export type GetCartRentalOfferAvailabilityResponse = z.infer<
	typeof GetCartRentalOfferAvailabilityResponseSchema
>;
