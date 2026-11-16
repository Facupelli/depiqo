import { useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import { type EditDeliveryVariables, editDelivery } from "./edit-delivery.api";

export function useEditDelivery() {
	return useMutation({
		mutationFn: editDelivery,
		retry: false,
		meta: {
			invalidates: (variables: EditDeliveryVariables) => [
				rentalKeys.all(),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
		},
	});
}
