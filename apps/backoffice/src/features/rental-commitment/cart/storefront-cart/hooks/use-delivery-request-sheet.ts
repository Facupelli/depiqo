import { useState } from "react";
import type {
	DeliveryRequestField,
	DeliveryRequestFormState,
} from "../cart-order.types";
import {
	isDeliveryRequestComplete,
	normalizeDeliveryRequest,
} from "../cart-order.utils";

type FulfillmentMethod = "PICKUP" | "DELIVERY";

type UseDeliveryRequestSheetParams = {
	supportsDelivery: boolean;
	deliveryRequest: DeliveryRequestFormState;
	onFulfillmentMethodChange: (value: FulfillmentMethod) => void;
	onDeliveryRequestFieldChange: (
		field: DeliveryRequestField,
		value: string,
	) => void;
};

export function useDeliveryRequestSheet({
	supportsDelivery,
	deliveryRequest,
	onFulfillmentMethodChange,
	onDeliveryRequestFieldChange,
}: UseDeliveryRequestSheetParams) {
	const [isOpen, setIsOpen] = useState(false);
	const [draftDeliveryRequest, setDraftDeliveryRequest] =
		useState<DeliveryRequestFormState>(deliveryRequest);
	const [showDraftDeliveryError, setShowDraftDeliveryError] = useState(false);

	const confirmedDeliveryRequest = normalizeDeliveryRequest({
		deliveryRequest,
		fulfillmentMethod: "DELIVERY",
	});
	const hasConfirmedDeliveryAddress = isDeliveryRequestComplete(
		confirmedDeliveryRequest,
	);

	const open = () => {
		setDraftDeliveryRequest(deliveryRequest);
		setShowDraftDeliveryError(false);
		setIsOpen(true);
	};

	const close = () => {
		setDraftDeliveryRequest(deliveryRequest);
		setShowDraftDeliveryError(false);
		setIsOpen(false);
	};

	const handleOpenChange = (openValue: boolean) => {
		if (!supportsDelivery) {
			close();
			return;
		}

		if (openValue) {
			open();
			return;
		}

		close();

		if (!hasConfirmedDeliveryAddress) {
			onFulfillmentMethodChange("PICKUP");
		}
	};

	const selectFulfillmentMethod = (value: FulfillmentMethod) => {
		if (value === "PICKUP") {
			close();
			onFulfillmentMethodChange("PICKUP");
			return;
		}

		onFulfillmentMethodChange("DELIVERY");
		open();
	};

	const updateDraftField = (field: DeliveryRequestField, value: string) => {
		setDraftDeliveryRequest((current) => ({ ...current, [field]: value }));
		setShowDraftDeliveryError(false);
	};

	const confirm = () => {
		const normalizedDraftDeliveryRequest = normalizeDeliveryRequest({
			deliveryRequest: draftDeliveryRequest,
			fulfillmentMethod: "DELIVERY",
		});

		if (!isDeliveryRequestComplete(normalizedDraftDeliveryRequest)) {
			setShowDraftDeliveryError(true);
			return;
		}

		for (const [field, value] of Object.entries(draftDeliveryRequest)) {
			onDeliveryRequestFieldChange(field as DeliveryRequestField, value);
		}

		setShowDraftDeliveryError(false);
		setIsOpen(false);
	};

	return {
		isOpen,
		draftDeliveryRequest,
		showDraftDeliveryError,
		hasConfirmedDeliveryAddress,
		open,
		handleOpenChange,
		selectFulfillmentMethod,
		updateDraftField,
		confirm,
	};
}
