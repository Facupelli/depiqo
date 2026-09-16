import type { CalculateDraftRentalPriceResponseDto } from "@repo/api-contracts";
import { createContext, use } from "react";

export type DraftRentalComposerContextValue = {
	state: {
		selectedBranchName: string | null;
		branchMissing: boolean;
		timezone: string;
		pricePreview: CalculateDraftRentalPriceResponseDto | undefined;
	};
	meta: {
		isPriceLoading: boolean;
		isPriceError: boolean;
		isSubmitting: boolean;
		submitDisabled: boolean;
		submitError: string | null;
		submitLabel: string;
	};
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
		<DraftRentalComposerContext value={value}>
			{children}
		</DraftRentalComposerContext>
	);
}

export function useDraftRentalComposer() {
	const context = use(DraftRentalComposerContext);

	if (!context) {
		throw new Error(
			"useDraftRentalComposer must be used within DraftRentalComposerProvider",
		);
	}

	return context;
}
