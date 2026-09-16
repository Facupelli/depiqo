import type { GetBranchesBranchDto } from "@repo/api-contracts";
import { Card, CardContent } from "@repo/ui/components/card";
import { useStore } from "@tanstack/react-form";
import { AlertCircle } from "lucide-react";
import { useMemo } from "react";
import { useAppForm } from "@/shared/contexts/form.context";
import { useBranchTimezoneResolver } from "@/shared/timezone/operational-timezone.hooks";
import type { RentalCustomerDisplayFacts } from "../customer-selection/rental-customer-selector";
import { useCalculatedDraftRentalPrice } from "./calculate-draft-rental-price.queries";
import { DraftRentalProductsSection } from "./components/draft-rental-products-section";
import {
	DraftRentalReviewPanel,
	PriceAdjustableDraftRentalReviewPanel,
} from "./components/draft-rental-review-panel";
import { DraftRentalSetupSection } from "./components/draft-rental-setup-section";
import {
	type DraftRentalComposerContextValue,
	DraftRentalComposerProvider,
} from "./draft-rental-composer.context";
import {
	createDraftRentalComposerFormSchema,
	type DraftRentalComposerFormValues,
	toCalculateDraftRentalPriceDto,
} from "./draft-rental-composer.schema";

export type DraftRentalBranchDisplayFacts = {
	id: string;
	name: string;
	timezone: string | null;
};

type DraftRentalComposerProps = {
	activeBranches: GetBranchesBranchDto[];
	defaultValues: DraftRentalComposerFormValues;
	initialCustomer?: RentalCustomerDisplayFacts;
	initialBranch?: DraftRentalBranchDisplayFacts;
	onSubmit: (
		values: DraftRentalComposerFormValues,
		timezone: string,
	) => Promise<void>;
	isSubmitting: boolean;
	submitDisabled?: boolean;
	submitError: string | null;
	submitLabel: string;
	missingBranchMessage: string;
};

export function DraftRentalComposer(props: DraftRentalComposerProps) {
	return <DraftRentalComposerLayout {...props} reviewMode="standard" />;
}

export function PriceAdjustableDraftRentalComposer(
	props: DraftRentalComposerProps,
) {
	return <DraftRentalComposerLayout {...props} reviewMode="price-adjustable" />;
}

function DraftRentalComposerLayout({
	activeBranches,
	defaultValues,
	initialCustomer,
	initialBranch,
	onSubmit,
	isSubmitting,
	submitDisabled = false,
	submitError,
	submitLabel,
	missingBranchMessage,
	reviewMode,
}: DraftRentalComposerProps & {
	reviewMode: "standard" | "price-adjustable";
}) {
	const resolveKnownBranchTimezone = useBranchTimezoneResolver();
	const resolveBranchTimezone = useMemo(
		() => (branchId: string) => {
			if (initialBranch?.id === branchId && initialBranch.timezone) {
				return initialBranch.timezone;
			}

			return resolveKnownBranchTimezone(branchId);
		},
		[initialBranch, resolveKnownBranchTimezone],
	);
	const formSchema = useMemo(
		() =>
			createDraftRentalComposerFormSchema({
				selectableBranchIds: new Set(activeBranches.map((branch) => branch.id)),
				resolveBranchTimezone,
			}),
		[activeBranches, resolveBranchTimezone],
	);
	const form = useAppForm({
		defaultValues,
		validators: {
			onSubmit: formSchema,
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
	const persistedBranch =
		initialBranch?.id === values.branchId ? initialBranch : undefined;
	const timezone = resolveBranchTimezone(values.branchId);
	const priceBody = branchMissing ? null : buildPriceBody(values, timezone);
	const priceQuery = useCalculatedDraftRentalPrice(priceBody, {
		enabled: !!priceBody,
	});

	const contextValue: DraftRentalComposerContextValue = {
		state: {
			selectedBranchName: selectedBranch?.name ?? persistedBranch?.name ?? null,
			branchMissing,
			timezone,
			pricePreview: priceQuery.data,
		},
		meta: {
			isPriceLoading: priceQuery.isFetching,
			isPriceError: priceQuery.isError,
			isSubmitting,
			submitDisabled,
			submitError,
			submitLabel,
		},
	};

	return (
		<DraftRentalComposerProvider value={contextValue}>
			{branchMissing ? (
				<MissingBranchNotice message={missingBranchMessage} />
			) : null}
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-3">
					<DraftRentalSetupSection
						form={form}
						activeBranches={activeBranches}
						initialBranch={initialBranch}
						initialCustomer={initialCustomer}
					/>
					<DraftRentalProductsSection form={form} />
				</div>

				<aside className="lg:sticky lg:top-6 lg:self-start">
					{reviewMode === "price-adjustable" ? (
						<PriceAdjustableDraftRentalReviewPanel form={form} />
					) : (
						<DraftRentalReviewPanel form={form} />
					)}
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
