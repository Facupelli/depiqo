import { z } from "zod";

export const rejectOrderParamsSchema = z.object({
	orderId: z.uuid(),
});

export const rejectOrderRequestSchema = z.object({
	rejectionReason: z.string().trim().min(1).max(1000).nullable().optional(),
});

export type RejectOrderParamsDto = z.infer<typeof rejectOrderParamsSchema>;
export type RejectOrderRequestDto = z.infer<typeof rejectOrderRequestSchema>;
