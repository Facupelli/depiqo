import type {
	GetBranchesBranchDto,
	GetRentalDetailResponseDto,
} from "@repo/api-contracts";
import { Card, CardContent } from "@repo/ui/components/card";
import { useSelector, useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { shallow } from "@tanstack/react-store";
import { AlertCircle } from "lucide-react";
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
	type DraftRentalDerivationValues,
} from "./draft-rental-composer.schema";
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
		};
		return {
			formSchema: createDraftRentalComposerFormSchema(context),
			derivationSchema: createDraftRentalDerivationSchema(context),
		};
	}, [activeBranches, resolveBranchTimezone]);
	const form = useAppForm({
		defaultValues,
		validators: { onChange: formSchema, onSubmit: formSchema },
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
				preview: query?.data,
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
		({ values }): DraftRentalDerivationValues => ({
			branchId: values.branchId,
			rentalCustomerId: values.rentalCustomerId,
			periodStartDate: values.periodStartDate,
			periodStartTime: values.periodStartTime,
			periodEndDate: values.periodEndDate,
			periodEndTime: values.periodEndTime,
			selectedOffers: values.selectedOffers,
			fulfillmentMethod: values.fulfillmentMethod,
			deliveryDestination: values.deliveryDestination,
			insuranceSelected: values.insuranceSelected,
			targetTotal: values.targetTotal,
			deliveryAgreementDecision: values.deliveryAgreementDecision,
			deliveryAgreementAmount: values.deliveryAgreementAmount,
			transportReservationMinutes: values.transportReservationMinutes,
			deliveryExceptionAccepted: values.deliveryExceptionAccepted,
		}),
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
	const preview = proposal.body ? priceQuery.data : undefined;
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
			selectedBranchName: selectedBranch?.name ?? persistedBranch?.name ?? null,
			branchMissing,
			timezone,
			pricePreview: preview,
			canManageDelivery,
			storedAgreement,
			storedDeliveryCurrency,
			blockingMessages: readiness.messages,
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
			{branchMissing ? (
				<Card className="mb-4 border-amber-200 bg-amber-50">
					<CardContent className="flex items-center gap-2 py-3 text-sm text-amber-900">
						<AlertCircle className="size-4" />
						{missingBranchMessage}
					</CardContent>
				</Card>
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
