import { toCalculateCartPriceBody } from "@/v2/features/pricing/calculate-cart-price/calculate-cart-price.mapper";
import { useCalculatedCartPrice } from "@/v2/features/pricing/calculate-cart-price/calculate-cart-price.queries";
import type { V2RentalCartItem } from "../v2-rental-cart.types";
import {
	buildCartPricePreviewBody,
	isValidCartRentalPeriod,
} from "./cart-checkout-model";

type CartCheckoutPeriod = {
	start: Date;
	end: Date;
};

type UseCartPricePreviewParams = {
	branchId: string;
	rentalPeriod: CartCheckoutPeriod;
	insuranceSelected: boolean;
	couponCode: string;
	customerId?: string;
	cartItems: V2RentalCartItem[];
};

export function useCartPricePreview({
	branchId,
	rentalPeriod,
	insuranceSelected,
	couponCode,
	customerId,
	cartItems,
}: UseCartPricePreviewParams) {
	const pricingBody = isValidCartRentalPeriod(rentalPeriod)
		? toCalculateCartPriceBody(
				buildCartPricePreviewBody({
					branchId,
					rentalPeriod,
					insuranceSelected,
					couponCode,
					customerId,
					cartItems,
				}),
			)
		: null;

	const {
		data: pricing,
		isFetching: isPriceLoading,
		isError: isPriceError,
	} = useCalculatedCartPrice(pricingBody);

	return {
		pricing,
		isPriceLoading,
		isPriceError,
	};
}
