import { useMemo, useState } from "react";
import {
	type DeliveryDefaultsFormState,
	type DeliveryRequestField,
	type DeliveryRequestFormState,
	EMPTY_DELIVERY_REQUEST,
} from "../cart-order.types";
import { normalizeDeliveryRequest } from "../cart-order.utils";

function toInitialDeliveryRequest(
	deliveryDefaults: DeliveryDefaultsFormState,
): DeliveryRequestFormState {
	return {
		...EMPTY_DELIVERY_REQUEST,
		country: deliveryDefaults.country,
		state: deliveryDefaults.state,
		city: deliveryDefaults.city,
		postalCode: deliveryDefaults.postalCode,
	};
}

export function useCartOrderDelivery({
	supportsDelivery,
	deliveryDefaults,
}: {
	supportsDelivery: boolean;
	deliveryDefaults: DeliveryDefaultsFormState;
}) {
	const [fulfillmentMethod, setFulfillmentMethod] = useState<
		"PICKUP" | "DELIVERY"
	>("PICKUP");
	const [deliveryRequest, setDeliveryRequest] =
		useState<DeliveryRequestFormState>(() =>
			toInitialDeliveryRequest(deliveryDefaults),
		);
	const [isDeliveryDetailsRequired, setIsDeliveryDetailsRequired] =
		useState(false);

	const onFulfillmentMethodChange = (value: "PICKUP" | "DELIVERY") => {
		if (value === "DELIVERY" && !supportsDelivery) {
			return;
		}

		setFulfillmentMethod(value);

		if (value === "PICKUP") {
			setIsDeliveryDetailsRequired(false);
			return;
		}
	};

	const onDeliveryRequestFieldChange = (
		field: DeliveryRequestField,
		value: string,
	) => {
		setDeliveryRequest((current) => ({ ...current, [field]: value }));
		setIsDeliveryDetailsRequired(false);
	};

	const normalizedDeliveryRequest = useMemo(
		() =>
			normalizeDeliveryRequest({
				deliveryRequest,
				fulfillmentMethod,
			}),
		[deliveryRequest, fulfillmentMethod],
	);

	return {
		supportsDelivery,
		fulfillmentMethod,
		deliveryRequest,
		normalizedDeliveryRequest,
		isDeliveryDetailsRequired,
		onFulfillmentMethodChange,
		onDeliveryRequestFieldChange,
		requireDeliveryDetails: () => setIsDeliveryDetailsRequired(true),
	};
}
