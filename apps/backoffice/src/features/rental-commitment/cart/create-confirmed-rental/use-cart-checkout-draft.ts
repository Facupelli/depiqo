import type { GetStorefrontBranchDto } from "@repo/api-contracts";
import { useState } from "react";
import { useCartCheckoutDelivery } from "./use-cart-checkout-delivery";
import { useCartCheckoutTimes } from "./use-cart-checkout-times";

type UseCartCheckoutDraftParams = {
	isInsuranceEnabled: boolean;
	supportsDelivery: boolean;
	deliveryDefaults: GetStorefrontBranchDto["deliveryDefaults"];
};

export function useCartCheckoutDraft({
	isInsuranceEnabled,
	supportsDelivery,
	deliveryDefaults,
}: UseCartCheckoutDraftParams) {
	const [insuranceSelected, setInsuranceSelected] =
		useState(isInsuranceEnabled);

	const [couponCode, setCouponCode] = useState("");

	const times = useCartCheckoutTimes();

	const delivery = useCartCheckoutDelivery({
		supportsDelivery,
		deliveryDefaults: {
			country: deliveryDefaults.country ?? "",
			state: deliveryDefaults.stateRegion ?? "",
			city: deliveryDefaults.city ?? "",
			postalCode: deliveryDefaults.postalCode ?? "",
		},
	});

	return {
		insuranceSelected,
		onInsuranceSelectedChange: setInsuranceSelected,

		couponCode,
		onCouponCodeChange: setCouponCode,

		times,
		delivery,
	};
}
