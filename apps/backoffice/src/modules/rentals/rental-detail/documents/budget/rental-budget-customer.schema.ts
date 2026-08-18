import {
	type GenerateRentalBudgetBodyDto,
	GenerateRentalBudgetBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const rentalBudgetCustomerFormSchema = z.object({
	fullName: z.string().trim().min(1, "Ingresá el nombre completo."),
	documentNumber: z.string(),
	address: z.string(),
	phone: z.string(),
});

export type RentalBudgetCustomerFormValues = z.infer<
	typeof rentalBudgetCustomerFormSchema
>;

export function createRentalBudgetCustomerFormDefaults(): RentalBudgetCustomerFormValues {
	return {
		fullName: "",
		documentNumber: "",
		address: "",
		phone: "",
	};
}

export function toGenerateRentalBudgetDto(
	values: RentalBudgetCustomerFormValues,
): GenerateRentalBudgetBodyDto {
	return GenerateRentalBudgetBodySchema.parse({
		customer: {
			fullName: values.fullName.trim(),
			documentNumber: emptyToUndefined(values.documentNumber),
			address: emptyToUndefined(values.address),
			phone: emptyToUndefined(values.phone),
		},
	});
}

function emptyToUndefined(value: string): string | undefined {
	const trimmedValue = value.trim();
	return trimmedValue === "" ? undefined : trimmedValue;
}
