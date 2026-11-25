import { BranchRentalAssetBufferSchema } from "@repo/api-contracts";
import { z } from "zod";

const minutesInput = z
	.string()
	.trim()
	.regex(/^\d+$/, "Ingresá un número entero de minutos, mayor o igual a 0.")
	.transform(Number);

export const rentalAssetBufferFormSchema = z.object({
	beforeBufferMinutes: minutesInput.pipe(
		BranchRentalAssetBufferSchema.shape.beforeBufferMinutes,
	),
	afterBufferMinutes: minutesInput.pipe(
		BranchRentalAssetBufferSchema.shape.afterBufferMinutes,
	),
});
