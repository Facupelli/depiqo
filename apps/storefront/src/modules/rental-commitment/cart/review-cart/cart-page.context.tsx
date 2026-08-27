import type {
	BranchScheduleSlotDto,
	CalculateCartPriceResponseDto,
	GetPublicTenantConfigResponseDto,
	GetStorefrontBranchDto,
} from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { createContext, useContext, useMemo, useState } from "react";
import { toCalculateCartPriceBody } from "@/modules/pricing/calculate-cart-price/calculate-cart-price.mapper";
import { useCalculatedCartPrice } from "@/modules/pricing/calculate-cart-price/calculate-cart-price.queries";
import { useStorefrontBranchScheduleSlots } from "@/modules/tenant-management/branches/branch-schedule.queries";
import { useCartRentalOfferAvailability } from "../availability/cart-rental-offer-availability.queries";
import type { GetCartRentalOfferAvailabilityInput } from "../availability/get-cart-rental-offer-availability.schema";
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
	pickupSlots?: BranchScheduleSlotDto[];
	returnSlots?: BranchScheduleSlotDto[];
	areSlotsLoading: boolean;
	isPricingReady: boolean;
	isPeriodInvalid: boolean;
};

type AvailabilitySlice = {
	availableCountByRentalOfferId: ReadonlyMap<string, number>;
	isAvailabilityLoading: boolean;
	isAvailabilityError: boolean;
};

type PricingSlice = {
	config: GetPublicTenantConfigResponseDto;
	pricing?: CalculateCartPriceResponseDto;
	isPriceLoading: boolean;
	isPriceError: boolean;
	insuranceSelected: boolean;
	setInsuranceSelected: (value: boolean) => void;
};

type BookingFeedbackSlice = {
	unavailableRentalOfferIds: string[];
	setUnavailableRentalOfferIds: (rentalOfferIds: string[]) => void;
	clearUnavailableRentalOfferIds: () => void;
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
	availability: AvailabilitySlice;
	pricing: PricingSlice;
	bookingFeedback: BookingFeedbackSlice;
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
export const useCartAvailabilityContext = () => useCartPageValue().availability;
export const useCartPricingContext = () => useCartPageValue().pricing;
export const useCartBookingFeedbackContext = () =>
	useCartPageValue().bookingFeedback;
export const useCartFulfillmentContext = () => useCartPageValue().fulfillment;

export function CartPageProvider({
	children,
	branch,
	config,
	periodStart,
	periodEnd,
	pickupInstant,
	returnInstant,
}: {
	children: React.ReactNode;
	branch: GetStorefrontBranchDto;
	config: GetPublicTenantConfigResponseDto;
	periodStart: string;
	periodEnd: string;
	pickupInstant?: string;
	returnInstant?: string;
}) {
	const navigate = useNavigate();
	const items = useRentalCartItems();
	const actions = useRentalCartActions();
	const { data: slots, isLoading: areSlotsLoading } =
		useStorefrontBranchScheduleSlots(branch.id, {
			periodStart,
			periodEnd,
		});
	const pickupSlot = slots?.pickupSlots?.find(
		(slot) => slot.instant === pickupInstant,
	);
	const returnSlot = slots?.returnSlots?.find(
		(slot) => slot.instant === returnInstant,
	);
	const [insuranceSelected, setInsuranceSelected] = useState(
		config.insuranceEnabled,
	);
	const [unavailableRentalOfferIds, setUnavailableRentalOfferIds] = useState<
		string[]
	>([]);
	// TODO(persistence): fulfillment state is lost across navigation (e.g. login
	// round-trips). Track as a separate task.
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
	const availabilityInput =
		useMemo<GetCartRentalOfferAvailabilityInput | null>(() => {
			const rentalOfferIds = items.map((item) => item.rentalOfferId).sort();
			if (rentalOfferIds.length === 0) return null;

			return {
				branchId: branch.id,
				periodStart,
				periodEnd,
				rentalOfferIds,
			};
		}, [branch.id, periodStart, periodEnd, items]);
	const availabilityQuery = useCartRentalOfferAvailability(availabilityInput);
	const availableCountByRentalOfferId = useMemo(() => {
		if (availabilityQuery.isFetching || availabilityQuery.isError) {
			return new Map<string, number>();
		}

		return new Map(
			availabilityQuery.data?.data.map((item) => [
				item.rentalOfferId,
				item.availableCount,
			]) ?? [],
		);
	}, [
		availabilityQuery.data,
		availabilityQuery.isError,
		availabilityQuery.isFetching,
	]);
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
				setPickupSlot: (slot) => {
					setUnavailableRentalOfferIds([]);
					void navigate({
						to: "/cart",
						search: (prev) => ({ ...prev, pickupInstant: slot.instant }),
						replace: true,
					});
				},
				setReturnSlot: (slot) => {
					setUnavailableRentalOfferIds([]);
					void navigate({
						to: "/cart",
						search: (prev) => ({ ...prev, returnInstant: slot.instant }),
						replace: true,
					});
				},
				pickupSlots: slots?.pickupSlots,
				returnSlots: slots?.returnSlots,
				areSlotsLoading,
				isPricingReady,
				isPeriodInvalid,
			},
			availability: {
				availableCountByRentalOfferId,
				isAvailabilityLoading: availabilityQuery.isFetching,
				isAvailabilityError: availabilityQuery.isError,
			},
			pricing: {
				config,
				pricing: priceQuery.data,
				isPriceLoading: priceQuery.isFetching,
				isPriceError: priceQuery.isError,
				insuranceSelected,
				setInsuranceSelected,
			},
			bookingFeedback: {
				unavailableRentalOfferIds,
				setUnavailableRentalOfferIds,
				clearUnavailableRentalOfferIds: () => setUnavailableRentalOfferIds([]),
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
			navigate,
			branch,
			config,
			periodStart,
			periodEnd,
			slots,
			areSlotsLoading,
			pickupSlot,
			returnSlot,
			isPricingReady,
			isPeriodInvalid,
			priceQuery.data,
			availabilityQuery.isFetching,
			availabilityQuery.isError,
			availableCountByRentalOfferId,
			priceQuery.isFetching,
			priceQuery.isError,
			insuranceSelected,
			unavailableRentalOfferIds,
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
