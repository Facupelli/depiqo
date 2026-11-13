import type { FormLikeAPI } from "@tanstack/react-form";
import {
	canPreserveStaffAgreement,
	type DraftRentalComposerFormValues,
} from "./draft-rental-composer.schema";

// Called synchronously by transportation-input handlers, never by an Effect.
// Discard pending decisions instead of reviving them after an A -> B -> A edit.
// Only a new arrangement establishes terms through SET, not an address edit.
export function resetPendingDeliveryReview(
	form: Pick<
		FormLikeAPI<DraftRentalComposerFormValues, never>,
		"setFieldValue" | "getFieldValue"
	> & { options: { defaultValues?: DraftRentalComposerFormValues } },
) {
	form.setFieldValue(
		"deliveryAgreementDecision",
		form.getFieldValue("deliveryArrangement") === "STAFF_ARRANGED" &&
			!canPreserveStaffAgreement(form.options.defaultValues)
			? "SET"
			: "",
	);
	form.setFieldValue("deliveryExceptionAccepted", false);
	form.setFieldValue("deliveryExceptionReason", "");
}
