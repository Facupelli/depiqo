import type {
	BranchScheduleSlotDto,
	CalculateCartPriceResponseDto,
	GetPublicTenantConfigResponseDto,
	GetStorefrontBranchDto,
} from "@repo/api-contracts";
import { createContext, useContext, useMemo, useState } from "react";
import { toCalculateCartPriceBody } from "@/modules/pricing/calculate-cart-price/calculate-cart-price.mapper";
import { useCalculatedCartPrice } from "@/modules/pricing/calculate-cart-price/calculate-cart-price.queries";
import { useRentalCartActions, useRentalCartItems } from "../rental-cart.hooks";
import type {
	DeliveryRequestField,
	DeliveryRequestFormState,
	FulfillmentMethod,
} from "./cart-checkout.types";
import {
	createDeliveryRequestDefaultValues,
	isDeliveryRequestComplete,
	normalizeDeliveryRequest,
} from "./cart-checkout.utils";

type CartSlice = {
	items: ReturnType<typeof useRentalCartItems>;
	actions: ReturnType<typeof useRentalCartActions>;
};

type RentalPeriodSlice = {
	branch: GetStorefrontBranchDto;
	periodStart: string;
	periodEnd: string;
	pickupSlot?: BranchScheduleSlotDto;
	returnSlot?: BranchScheduleSlotDto;
	setPickupSlot: (value: BranchScheduleSlotDto) => void;
	setReturnSlot: (value: BranchScheduleSlotDto) => void;
	isPricingReady: boolean;
	isPeriodInvalid: boolean;
};

type PricingSlice = {
	config: GetPublicTenantConfigResponseDto;
	pricing?: CalculateCartPriceResponseDto;
	isPriceLoading: boolean;
	isPriceError: boolean;
	insuranceSelected: boolean;
	setInsuranceSelected: (value: boolean) => void;
};

type FulfillmentSlice = {
	branch: GetStorefrontBranchDto;
	fulfillmentMethod: FulfillmentMethod;
	deliveryRequest: DeliveryRequestFormState;
	draftDeliveryRequest: DeliveryRequestFormState;
	isDeliverySheetOpen: boolean;
	showDeliveryError: boolean;
	hasConfirmedDeliveryAddress: boolean;
	selectFulfillmentMethod: (value: FulfillmentMethod) => void;
	setDeliverySheetOpen: (open: boolean) => void;
	setDraftDeliveryField: (field: DeliveryRequestField, value: string) => void;
	confirmDeliveryRequest: () => void;
};

type CartPageValue = {
	cart: CartSlice;
	period: RentalPeriodSlice;
	pricing: PricingSlice;
	fulfillment: FulfillmentSlice;
};

const CartPageContext = createContext<CartPageValue | null>(null);

function useCartPageValue(): CartPageValue {
	const value = useContext(CartPageContext);
	if (!value)
		throw new Error("Cart context must be used inside CartPageProvider");
	return value;
}

export const useCartContext = () => useCartPageValue().cart;
export const useCartPeriodContext = () => useCartPageValue().period;
export const useCartPricingContext = () => useCartPageValue().pricing;
export const useCartFulfillmentContext = () => useCartPageValue().fulfillment;

export function CartPageProvider({
	children,
	branch,
	config,
	periodStart,
	periodEnd,
}: {
	children: React.ReactNode;
	branch: GetStorefrontBranchDto;
	config: GetPublicTenantConfigResponseDto;
	periodStart: string;
	periodEnd: string;
}) {
	const items = useRentalCartItems();
	const actions = useRentalCartActions();
	const [pickupSlot, setPickupSlot] = useState<BranchScheduleSlotDto>();
	const [returnSlot, setReturnSlot] = useState<BranchScheduleSlotDto>();
	const [insuranceSelected, setInsuranceSelected] = useState(
		config.insuranceEnabled,
	);
	const [fulfillmentMethod, setFulfillmentMethod] =
		useState<FulfillmentMethod>("PICKUP");
	const [deliveryRequest, setDeliveryRequest] = useState(() =>
		createDeliveryRequestDefaultValues(branch.deliveryDefaults),
	);
	const [draftDeliveryRequest, setDraftDeliveryRequest] =
		useState<DeliveryRequestFormState>(deliveryRequest);
	const [isDeliverySheetOpen, setIsDeliverySheetOpen] = useState(false);
	const [showDeliveryError, setShowDeliveryError] = useState(false);

	const hasBothTimes = pickupSlot !== undefined && returnSlot !== undefined;
	const start = pickupSlot ? new Date(pickupSlot.instant) : null;
	const end = returnSlot ? new Date(returnSlot.instant) : null;
	const isPeriodInvalid = Boolean(start && end && end <= start);
	const isPricingReady = hasBothTimes && !isPeriodInvalid;
	const body = toCalculateCartPriceBody({
		branchId: branch.id,
		periodStart: isPricingReady ? start : null,
		periodEnd: isPricingReady ? end : null,
		selectedOffers: items.map((item) => ({
			rentalOfferId: item.rentalOfferId,
			quantity: item.quantity,
		})),
		insuranceSelected,
		couponCode: "",
	});
	const priceQuery = useCalculatedCartPrice(body);
	const normalizedDeliveryRequest = normalizeDeliveryRequest(
		deliveryRequest,
		"DELIVERY",
	);
	const hasConfirmedDeliveryAddress = isDeliveryRequestComplete(
		normalizedDeliveryRequest,
	);
	const value = useMemo<CartPageValue>(
		() => ({
			cart: { items, actions },
			period: {
				branch,
				periodStart,
				periodEnd,
				pickupSlot,
				returnSlot,
				setPickupSlot,
				setReturnSlot,
				isPricingReady,
				isPeriodInvalid,
			},
			pricing: {
				config,
				pricing: priceQuery.data,
				isPriceLoading: priceQuery.isFetching,
				isPriceError: priceQuery.isError,
				insuranceSelected,
				setInsuranceSelected,
			},
			fulfillment: {
				branch,
				fulfillmentMethod,
				deliveryRequest,
				draftDeliveryRequest,
				isDeliverySheetOpen,
				showDeliveryError,
				hasConfirmedDeliveryAddress,
				selectFulfillmentMethod: (next) => {
					if (next === "PICKUP") {
						setFulfillmentMethod("PICKUP");
						setIsDeliverySheetOpen(false);
						return;
					}
					if (!branch.supportsDelivery) return;
					setFulfillmentMethod("DELIVERY");
					setDraftDeliveryRequest(deliveryRequest);
					setShowDeliveryError(false);
					setIsDeliverySheetOpen(true);
				},
				setDeliverySheetOpen: (open) => {
					if (open) {
						setDraftDeliveryRequest(deliveryRequest);
						setShowDeliveryError(false);
						setIsDeliverySheetOpen(true);
					} else {
						setDraftDeliveryRequest(deliveryRequest);
						setShowDeliveryError(false);
						setIsDeliverySheetOpen(false);
						if (!hasConfirmedDeliveryAddress) setFulfillmentMethod("PICKUP");
					}
				},
				setDraftDeliveryField: (field, next) => {
					setDraftDeliveryRequest((current) => ({
						...current,
						[field]: next,
					}));
					setShowDeliveryError(false);
				},
				confirmDeliveryRequest: () => {
					const normalized = normalizeDeliveryRequest(
						draftDeliveryRequest,
						"DELIVERY",
					);
					if (!isDeliveryRequestComplete(normalized)) {
						setShowDeliveryError(true);
						return;
					}
					setDeliveryRequest(draftDeliveryRequest);
					setShowDeliveryError(false);
					setIsDeliverySheetOpen(false);
				},
			},
		}),
		[
			items,
			actions,
			branch,
			config,
			periodStart,
			periodEnd,
			pickupSlot,
			returnSlot,
			isPricingReady,
			isPeriodInvalid,
			priceQuery.data,
			priceQuery.isFetching,
			priceQuery.isError,
			insuranceSelected,
			fulfillmentMethod,
			deliveryRequest,
			draftDeliveryRequest,
			isDeliverySheetOpen,
			showDeliveryError,
			hasConfirmedDeliveryAddress,
		],
	);

	return (
		<CartPageContext.Provider value={value}>
			{children}
		</CartPageContext.Provider>
	);
}
