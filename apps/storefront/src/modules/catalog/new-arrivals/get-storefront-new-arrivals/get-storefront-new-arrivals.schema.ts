import { z } from "zod";

export const GetStorefrontNewArrivalsInputSchema = z.object({
	branchId: z.string().trim().min(1),
	windowDays: z.number().int().positive(),
});

export type GetStorefrontNewArrivalsInputDto = z.infer<
	typeof GetStorefrontNewArrivalsInputSchema
>;
