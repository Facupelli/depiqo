import type { FormLikeAPI } from "@tanstack/react-form";
import type { DraftRentalComposerFormValues } from "./draft-rental-composer.schema";

// Called synchronously by transportation-input handlers, never by an Effect.
// Discard pending decisions instead of reviving them after an A -> B -> A edit.
// A new staff destination always establishes its terms through SET.
export function resetPendingDeliveryReview(
	form: Pick<
		FormLikeAPI<DraftRentalComposerFormValues, never>,
		"setFieldValue" | "getFieldValue"
	>,
) {
	form.setFieldValue(
		"deliveryAgreementDecision",
		form.getFieldValue("deliveryDestination").status === "NEW_STAFF_DESTINATION"
			? "SET"
			: "",
	);
	form.setFieldValue("deliveryExceptionAccepted", false);
	form.setFieldValue("deliveryExceptionReason", "");
}
