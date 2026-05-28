import type { ProductTypeResponse } from "@repo/schemas";
import { createContext, type ReactNode, useContext } from "react";

interface ProductContextValue {
	product: ProductTypeResponse;
}

const ProductContext = createContext<ProductContextValue | null>(null);

export function ProductProvider({
	product,
	children,
}: ProductContextValue & { children: ReactNode }) {
	return (
		<ProductContext.Provider value={{ product }}>
			{children}
		</ProductContext.Provider>
	);
}

export function useProduct() {
	const context = useContext(ProductContext);
	if (!context) {
		throw new Error("useProduct must be used within ProductProvider");
	}
	return context;
}
