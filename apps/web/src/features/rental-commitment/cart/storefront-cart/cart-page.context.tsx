import { createContext, useContext } from "react";
import type {
	BookingSlice,
	CartPageContextValue,
	CartSlice,
	DeliverySlice,
	LocationSlice,
	PricingSlice,
	TimesSlice,
} from "@/features/rental-commitment/cart/storefront-cart/cart-page.context.types";
import { useStorefrontBranches } from "@/features/rental-commitment/branches/branches.queries";
import { usePublicTenantConfig } from "@/features/tenant-management/tenant/tenant.queries";
import { useCartPageModel } from "./hooks/use-cart-page-model";

const CartPageContext = createContext<CartPageContextValue | null>(null);

export function useCartPageContext(): CartPageContextValue {
	const ctx = useContext(CartPageContext);
	if (!ctx)
		throw new Error("useCartPageContext must be used inside CartPageProvider");
	return ctx;
}

export function useCartContext(): CartSlice {
	return useCartPageContext().cart;
}

export function useCartLocationContext(): LocationSlice {
	return useCartPageContext().location;
}

export function useCartPricingContext(): PricingSlice {
	return useCartPageContext().pricing;
}

export function useCartTimesContext(): TimesSlice {
	return useCartPageContext().times;
}

export function useCartDeliveryContext(): DeliverySlice {
	return useCartPageContext().delivery;
}

export function useCartBookingContext(): BookingSlice {
	return useCartPageContext().booking;
}

type CartPageProviderProps = {
	children: React.ReactNode;
	branchId: string;
	periodStart: string;
	periodEnd: string;
};

export function CartPageProvider({
	children,
	branchId,
	periodStart,
	periodEnd,
}: CartPageProviderProps) {
	const { data: branches } = useStorefrontBranches();
	const { data: tenantPublicConfig } = usePublicTenantConfig();

	const branch = branches?.find((branch) => branch.id === branchId);

	if (!branch || !tenantPublicConfig) {
		throw new Error(`Branch not found for cart: ${branchId}`);
	}

	const cartPageModel = useCartPageModel({
		tenantPublicConfig,
		branch,
		periodStart,
		periodEnd,
	});

	return (
		<CartPageContext.Provider value={cartPageModel}>
			{children}
		</CartPageContext.Provider>
	);
}
