import type {
	GetPublicTenantConfigResponseDto,
	GetStorefrontBranchDto,
} from "@repo/api-contracts";
import { buildCartRentalPeriod } from "@/features/rental-commitment/cart/create-confirmed-rental/cart-checkout-model";
import { buildCartPageContextValue } from "@/features/rental-commitment/cart/create-confirmed-rental/cart-page-context-model";
import { useCartBookingCommand } from "@/features/rental-commitment/cart/create-confirmed-rental/use-cart-booking-command";
import { useCartCheckoutDraft } from "@/features/rental-commitment/cart/create-confirmed-rental/use-cart-checkout-draft";
import { useCartPricePreview } from "@/features/rental-commitment/cart/create-confirmed-rental/use-cart-price-preview";
import {
	useV2RentalCartActions,
	useV2RentalCartItems,
} from "@/features/rental-commitment/cart/v2-rental-cart.hooks";
import { useCurrentUser } from "@/features/tenant-management/auth/auth.queries";

type UseCartPageModelParams = {
	tenantPublicConfig: GetPublicTenantConfigResponseDto;
	branch: GetStorefrontBranchDto;
	periodStart: string;
	periodEnd: string;
};

export function useCartPageModel(params: UseCartPageModelParams) {
	const { tenantPublicConfig, branch, periodStart, periodEnd } = params;

	const { data: customer } = useCurrentUser();
	const cartItems = useV2RentalCartItems();
	const { clearCart } = useV2RentalCartActions();

	const customerId =
		customer?.actorType === "TENANT_CUSTOMER" ? customer.id : undefined;

	const draft = useCartCheckoutDraft({
		isInsuranceEnabled: tenantPublicConfig.insuranceEnabled,
		supportsDelivery: branch.supportsDelivery,
		deliveryDefaults: branch.deliveryDefaults,
	});

	const rentalPeriod = buildCartRentalPeriod({
		periodStart,
		periodEnd,
		timezone: branch.timezone,
		pickupTime: draft.times.pickupTime,
		returnTime: draft.times.returnTime,
	});

	const pricePreview = useCartPricePreview({
		branchId: branch.id,
		rentalPeriod,
		insuranceSelected: draft.insuranceSelected,
		couponCode: draft.couponCode,
		customerId,
		cartItems,
	});

	const booking = useCartBookingCommand({
		branch: {
			id: branch.id,
			name: branch.name,
		},
		periodStart,
		rentalPeriod,
		cartItems,
		isAuthenticated: Boolean(customer),

		pickupTime: draft.times.pickupTime,
		returnTime: draft.times.returnTime,
		requireTimes: draft.times.requireTimes,

		fulfillmentMethod: draft.delivery.fulfillmentMethod,
		normalizedDeliveryRequest: draft.delivery.normalizedDeliveryRequest,
		requireDeliveryDetails: draft.delivery.requireDeliveryDetails,
		onFulfillmentMethodChange: draft.delivery.onFulfillmentMethodChange,

		insuranceSelected: draft.insuranceSelected,

		clearCart,
	});

	return buildCartPageContextValue({
		tenantPublicConfig,
		branch,
		periodStart,
		periodEnd,
		cartItems,
		draft,
		pricePreview,
		booking,
		isAuthenticated: Boolean(customer),
	});
}
