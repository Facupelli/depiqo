import type {
	GetRentalDetailResponseDto,
	PreviewDraftRentalCostResponseDto,
} from "@repo/api-contracts";
import { createContext, use } from "react";

export type DraftRentalComposerContextValue = {
	state: {
		selectedBranchName: string | null;
		branchMissing: boolean;
		timezone: string;
		pricePreview: PreviewDraftRentalCostResponseDto | undefined;
		canManageDelivery: boolean;
		storedAgreement?: NonNullable<
			GetRentalDetailResponseDto["draftDelivery"]
		>["staffAgreement"];
		storedDeliveryCurrency?: string;
		blockingMessages: string[];
	};
	meta: {
		isPriceLoading: boolean;
		retryPricePreview?: () => void;
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
