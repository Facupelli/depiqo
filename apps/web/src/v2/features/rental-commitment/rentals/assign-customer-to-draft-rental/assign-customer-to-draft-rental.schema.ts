import {
	type AssignCustomerToDraftRentalBodyDto,
	AssignCustomerToDraftRentalBodySchema,
} from "@repo/api-contracts";
import { z } from "zod";

export const assignCustomerToDraftRentalFormSchema = z.object({
	customerId: z.string().trim().min(1, "Seleccioná un cliente"),
});

export type AssignCustomerToDraftRentalFormValues = z.infer<
	typeof assignCustomerToDraftRentalFormSchema
>;

export function createAssignCustomerToDraftRentalDefaultValues(): AssignCustomerToDraftRentalFormValues {
	return {
		customerId: "",
	};
}

export function toAssignCustomerToDraftRentalDto(
	values: AssignCustomerToDraftRentalFormValues,
): AssignCustomerToDraftRentalBodyDto {
	return AssignCustomerToDraftRentalBodySchema.parse({
		customerId: values.customerId.trim(),
	});
}
