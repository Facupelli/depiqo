import { useMutation } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import {
	type EditDeliveryAgreementVariables,
	editDeliveryAgreement,
} from "./edit-delivery-agreement.api";

export function useEditDeliveryAgreement() {
	return useMutation({
		mutationFn: editDeliveryAgreement,
		retry: false,
		meta: {
			invalidates: (variables: EditDeliveryAgreementVariables) => [
				rentalKeys.all(),
				contractKeys.rentalSigningSummary(variables.rentalId),
			],
		},
	});
}
