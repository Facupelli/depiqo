import type { CalculateDraftRentalPriceResponseDto } from "@repo/api-contracts";
import { createContext, useContext } from "react";

export type DraftRentalComposerContextValue = {
	selectedBranchName: string | null;
	branchMissing: boolean;
	timezone: string;
	pricePreview: CalculateDraftRentalPriceResponseDto | undefined;
	isPriceLoading: boolean;
	isPriceError: boolean;
	isSubmitting: boolean;
};

const DraftRentalComposerContext =
	createContext<DraftRentalComposerContextValue | null>(null);

export function DraftRentalComposerProvider({
	value,
	children,
}: {
	value: DraftRentalComposerContextValue;
	children: React.ReactNode;
}) {
	return (
		<DraftRentalComposerContext.Provider value={value}>
			{children}
		</DraftRentalComposerContext.Provider>
	);
}

export function useDraftRentalComposer() {
	const context = useContext(DraftRentalComposerContext);

	if (!context) {
		throw new Error(
			"useDraftRentalComposer must be used within DraftRentalComposerProvider",
		);
	}

	return context;
}
