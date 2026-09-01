import { z } from "zod";

export const GetStorefrontCombosInputSchema = z.object({
	branchId: z.string().trim().min(1),
	periodStart: z.iso.date().optional(),
	periodEnd: z.iso.date().optional(),
	pickupInstant: z.iso.datetime({ offset: true }).optional(),
	returnInstant: z.iso.datetime({ offset: true }).optional(),
});

export type GetStorefrontCombosInputDto = z.infer<
	typeof GetStorefrontCombosInputSchema
>;
