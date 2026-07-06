export type RentalPeriod = {
	start: Date;
	end: Date;
};

export type CartIncludedItem = {
	name: string;
	quantity: number;
	notes: string | null;
};

export type CartProductItem = {
	type: "PRODUCT";
	productTypeId: string;
	name: string;
	quantity: number;
	pricePerUnit: number;
	billingUnitLabel: string;
	assetCount: number | null;
	imageUrl: string | null;
	includedItems: CartIncludedItem[];
};

export type CartItem = CartProductItem;

export type CartItemKey = { type: "PRODUCT"; productTypeId: string };

export type ConflictAffectedItem = { type: "PRODUCT"; productTypeId: string };

export type ConflictGroup = {
	productTypeId: string;
	availableCount: number;
	requestedCount: number;
	affectedItems: ConflictAffectedItem[];
};

export type CartActions = {
	addProduct: (product: Omit<CartProductItem, "type" | "quantity">) => void;
	incrementQuantity: (key: CartItemKey) => void;
	decrementQuantity: (key: CartItemKey) => void;
	setQuantity: (key: CartItemKey, value: number) => void;
	removeItem: (key: CartItemKey) => void;
	clearCart: () => void;
};

export type CartState = {
	items: CartItem[];
	actions: CartActions;
};
