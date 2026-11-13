import type {
	GetBranchesBranchDto,
	GetRentalDetailResponseDto,
} from "@repo/api-contracts";
import { useSelector, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { shallow } from "@tanstack/react-store";
import { useMemo } from "react";
import { useAppForm } from "@/shared/contexts/form.context";
import { useBranchTimezoneResolver } from "@/shared/timezone/operational-timezone.hooks";
import type { RentalCustomerDisplayFacts } from "../customer-selection/rental-customer-selector";
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
	createDraftRentalDerivationSchema,
	type DraftRentalComposerFormValues,
} from "./draft-rental-composer.schema";
import {
	type DraftRentalCostPreviewSnapshot,
	getCurrentDraftRentalCostPreview,
	selectDraftRentalDerivationValues,
} from "./draft-rental-preview";
import {
	buildDraftRentalProposal,
	getDraftRentalReadiness,
} from "./draft-rental-readiness";
import {
	draftRentalCostPreviewOptions,
	useDraftRentalCostPreview,
} from "./preview-draft-rental-cost.queries";

export type DraftRentalBranchDisplayFacts = {
	id: string;
	name: string;
	timezone: string | null;
};

type DraftRentalComposerProps = {
	activeBranches: GetBranchesBranchDto[];
	canManageDelivery: boolean;
	rentalId?: string;
	expectedVersion?: number;
	storedAgreement?: NonNullable<
		GetRentalDetailResponseDto["draftDelivery"]
	>["staffAgreement"];
	storedDeliveryCurrency?: string;
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
	canManageDelivery,
	rentalId,
	expectedVersion,
	storedAgreement,
	storedDeliveryCurrency,
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
}: DraftRentalComposerProps & { reviewMode: "standard" | "price-adjustable" }) {
	const queryClient = useQueryClient();
	const resolveKnownBranchTimezone = useBranchTimezoneResolver();
	const resolveBranchTimezone = useMemo(
		() => (branchId: string) =>
			initialBranch?.id === branchId && initialBranch.timezone
				? initialBranch.timezone
				: resolveKnownBranchTimezone(branchId),
		[initialBranch, resolveKnownBranchTimezone],
	);
	const { formSchema, derivationSchema } = useMemo(() => {
		const context = {
			selectableBranchIds: new Set(activeBranches.map((branch) => branch.id)),
			resolveBranchTimezone,
			initialValues: defaultValues,
			canManageDelivery,
		};
		return {
			formSchema: createDraftRentalComposerFormSchema(context),
			derivationSchema: createDraftRentalDerivationSchema(context),
		};
	}, [activeBranches, resolveBranchTimezone, defaultValues, canManageDelivery]);
	const form = useAppForm({
		defaultValues,
		validators: {
			onChange: formSchema,
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			// Re-read the exact proposal's cache after Form validation, never a captured older preview.
			const timezone = resolveBranchTimezone(value.branchId);
			const proposal = buildDraftRentalProposal(
				value,
				formSchema,
				timezone,
				rentalId,
			);
			const query = proposal.body
				? queryClient.getQueryState(
						draftRentalCostPreviewOptions(proposal.body).queryKey,
					)
				: undefined;
			const readiness = getDraftRentalReadiness({
				values: value,
				inputMessages: proposal.messages,
				preview: getCurrentDraftRentalCostPreview(value, {
					values: value,
					query,
				}),
				previewError: query?.error,
				canManageDelivery,
				expectedVersion,
				submitDisabled,
				pending: isSubmitting,
				formValid: proposal.body !== null,
			});
			if (readiness.canSubmit) await onSubmit(value, timezone);
		},
	});
	// Reasons belong only to submission. Acceptance also affects readiness, not pricing.
	const values = useSelector(
		form.store,
		({ values }) => selectDraftRentalDerivationValues(values),
		{ compare: shallow },
	);
	const formValid = useStore(form.store, (state) => state.isValid);
	const formIsSubmitting = useStore(form.store, (state) => state.isSubmitting);
	const selectedBranch = activeBranches.find(
		(branch) => branch.id === values.branchId,
	);
	const branchMissing = !selectedBranch;
	const persistedBranch =
		initialBranch?.id === values.branchId ? initialBranch : undefined;
	const timezone = resolveBranchTimezone(values.branchId);
	const proposal = buildDraftRentalProposal(
		values,
		derivationSchema,
		timezone,
		rentalId,
	);
	const priceQuery = useDraftRentalCostPreview(proposal.body);
	const costPreview: DraftRentalCostPreviewSnapshot = {
		values,
		// The existing query key identifies the complete request; no previous-data placeholder is used.
		query: proposal.body ? priceQuery : undefined,
	};
	const preview = getCurrentDraftRentalCostPreview(values, costPreview);
	const readiness = getDraftRentalReadiness({
		values,
		inputMessages: proposal.messages,
		preview,
		previewError: priceQuery.error,
		canManageDelivery,
		expectedVersion,
		submitDisabled,
		pending: isSubmitting || formIsSubmitting,
		formValid,
	});
	const contextValue: DraftRentalComposerContextValue = {
		state: {
			validationContext: {
				selectableBranchIds: new Set(activeBranches.map((branch) => branch.id)),
				resolveBranchTimezone,
				initialValues: defaultValues,
				canManageDelivery,
			},
			rentalId,
			selectedBranchName: selectedBranch?.name ?? persistedBranch?.name ?? null,
			branchMissing,
			timezone,
			costPreview,
			canManageDelivery,
			// Dialogs compare their local arrangement with the persisted terms before reusing an agreement.
			storedAgreement,
			storedDeliveryCurrency,
			// Input validation belongs next to the fields, not in the pricing summary.
			blockingMessages: readiness.messages.filter(
				(message) => !proposal.messages.includes(message),
			),
		},
		meta: {
			isPriceLoading: priceQuery.isFetching,
			retryPricePreview:
				priceQuery.isError && !priceQuery.isFetching
					? () => {
							void priceQuery.refetch();
						}
					: undefined,
			isSubmitting: isSubmitting || formIsSubmitting,
			submitDisabled: !readiness.canSubmit,
			submitError,
			submitLabel,
		},
	};
	return (
		<DraftRentalComposerProvider value={contextValue}>
			<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-3">
					<DraftRentalSetupSection
						form={form}
						activeBranches={activeBranches}
						missingBranchMessage={missingBranchMessage}
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
