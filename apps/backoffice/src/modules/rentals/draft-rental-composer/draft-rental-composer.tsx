import type { GetBranchesBranchDto } from "@repo/api-contracts";
import { Card, CardContent } from "@repo/ui/components/card";
import { useStore } from "@tanstack/react-form";
import { AlertCircle } from "lucide-react";
import { useAppForm } from "@/shared/contexts/form.context";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useCalculatedDraftRentalPrice } from "./calculate-draft-rental-price.queries";
import { DraftRentalOfferSearchSection } from "./components/draft-rental-offer-search-section";
import { DraftRentalReviewPanel } from "./components/draft-rental-review-panel";
import { DraftRentalSelectedOffersSection } from "./components/draft-rental-selected-offers-section";
import { DraftRentalSetupSection } from "./components/draft-rental-setup-section";
import {
	type DraftRentalComposerContextValue,
	DraftRentalComposerProvider,
} from "./draft-rental-composer.context";
import {
	type DraftRentalComposerFormValues,
	draftRentalComposerFormSchema,
	toCalculateDraftRentalPriceDto,
} from "./draft-rental-composer.schema";

type DraftRentalComposerProps = {
	activeBranches: GetBranchesBranchDto[];
	defaultValues: DraftRentalComposerFormValues;
	onSubmit: (
		values: DraftRentalComposerFormValues,
		timezone: string,
	) => Promise<void>;
	isSubmitting: boolean;
	submitError: string | null;
	submitLabel: string;
	missingBranchMessage: string;
};

export function DraftRentalComposer({
	activeBranches,
	defaultValues,
	onSubmit,
	isSubmitting,
	submitError,
	submitLabel,
	missingBranchMessage,
}: DraftRentalComposerProps) {
	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: draftRentalComposerFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value, timezone);
		},
	});

	const values = useStore(form.store, (state) => state.values);
	const selectedBranch = activeBranches.find(
		(branch) => branch.id === values.branchId,
	);
	const branchMissing = !selectedBranch;
	const timezone = useBranchTimezone(values.branchId);
	const priceBody = buildPriceBody(values, timezone);
	const priceQuery = useCalculatedDraftRentalPrice(priceBody, {
		enabled: !!priceBody,
	});

	const contextValue: DraftRentalComposerContextValue = {
		selectedBranchName: selectedBranch?.name ?? null,
		branchMissing,
		timezone,
		pricePreview: priceQuery.data,
		isPriceLoading: priceQuery.isFetching,
		isPriceError: priceQuery.isError,
		isSubmitting,
		submitError,
		submitLabel,
	};

	return (
		<DraftRentalComposerProvider value={contextValue}>
			{branchMissing ? (
				<MissingBranchNotice message={missingBranchMessage} />
			) : null}
			<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-4">
					<DraftRentalSetupSection
						form={form}
						activeBranches={activeBranches}
					/>
					<DraftRentalOfferSearchSection form={form} />
					<DraftRentalSelectedOffersSection form={form} />
				</div>

				<aside className="lg:sticky lg:top-6 lg:self-start">
					<DraftRentalReviewPanel form={form} />
				</aside>
			</div>
		</DraftRentalComposerProvider>
	);
}

function MissingBranchNotice({ message }: { message: string }) {
	return (
		<Card className="mb-4 border-amber-200 bg-amber-50">
			<CardContent className="flex items-center gap-2 py-3 text-sm text-amber-900">
				<AlertCircle className="size-4" />
				{message}
			</CardContent>
		</Card>
	);
}

function buildPriceBody(
	values: DraftRentalComposerFormValues,
	timezone: string,
) {
	if (
		!values.branchId ||
		!values.periodStartDate ||
		!values.periodEndDate ||
		values.selectedOffers.length === 0
	) {
		return null;
	}

	try {
		return toCalculateDraftRentalPriceDto(values, timezone);
	} catch {
		return null;
	}
}
