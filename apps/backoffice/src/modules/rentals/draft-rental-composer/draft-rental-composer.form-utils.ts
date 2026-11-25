import type { FormLikeAPI } from "@tanstack/react-form";
import {
	canPreserveStaffAgreement,
	type DraftRentalComposerFormValues,
} from "./draft-rental-composer.schema";

// Called synchronously by transportation-input handlers, never by an Effect.
// Discard pending decisions instead of reviving them after an A -> B -> A edit.
export function resetPendingDeliveryReview(
	form: Pick<
		FormLikeAPI<DraftRentalComposerFormValues, never>,
		"setFieldValue" | "getFieldValue"
	> & { options: { defaultValues?: DraftRentalComposerFormValues } },
	initialValues = form.options.defaultValues,
) {
	form.setFieldValue(
		"deliveryAgreementDecision",
		form.getFieldValue("deliveryArrangement") === "STAFF_ARRANGED" &&
			!canPreserveStaffAgreement(initialValues)
			? "SET"
			: "",
	);
	form.setFieldValue("deliveryExceptionAccepted", false);
	form.setFieldValue("deliveryExceptionReason", "");
}
