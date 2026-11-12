import type { FormLikeAPI } from "@tanstack/react-form";
import type { DraftRentalComposerFormValues } from "./draft-rental-composer.schema";

// Called synchronously by transportation-input handlers, never by an Effect.
// Clearing the decision prevents it from reviving after an A -> B -> A edit.
export function resetPendingDeliveryReview(
	form: Pick<
		FormLikeAPI<DraftRentalComposerFormValues, never>,
		"setFieldValue"
	>,
) {
	form.setFieldValue("deliveryAgreementDecision", "");
	form.setFieldValue("deliveryExceptionAccepted", false);
	form.setFieldValue("deliveryExceptionReason", "");
}
