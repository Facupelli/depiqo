import type { RentalLocationResponse } from "@repo/schemas";
import { useState } from "react";
import { useCartOrderDelivery } from "@/features/rental/cart/hooks/use-cart-order-delivery";
import { useCartOrderTimes } from "@/features/rental/cart/hooks/use-cart-order-times";

type UseCartCheckoutDraftParams = {
	isInsuranceEnabled: boolean;
	supportsDelivery: boolean;
	deliveryDefaults: NonNullable<RentalLocationResponse["deliveryDefaults"]>;
};

export function useCartCheckoutDraft({
	isInsuranceEnabled,
	supportsDelivery,
	deliveryDefaults,
}: UseCartCheckoutDraftParams) {
	const [insuranceSelected, setInsuranceSelected] =
		useState(isInsuranceEnabled);

	const [couponCode, setCouponCode] = useState("");

	const times = useCartOrderTimes();

	const delivery = useCartOrderDelivery({
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
