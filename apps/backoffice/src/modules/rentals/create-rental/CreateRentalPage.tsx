import { Card, CardContent } from "@repo/ui/components/card";
import { useStore } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { useCurrentBranchId } from "@/application/current-branch/current-branch.hooks";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { useBranches } from "@/modules/settings/branches/branches.queries";
import { useAppForm } from "@/shared/contexts/form.context";
import { useSelectedBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useCalculatedDraftRentalPrice } from "./calculate-draft-rental-price.queries";
import { DraftRentalOfferSearchSection } from "./components/draft-rental-offer-search-section";
import { DraftRentalReviewPanel } from "./components/draft-rental-review-panel";
import { DraftRentalSelectedOffersSection } from "./components/draft-rental-selected-offers-section";
import { DraftRentalSetupSection } from "./components/draft-rental-setup-section";
import { useCreateDraftRental } from "./create-draft-rental.mutation";
import {
	type DraftRentalComposerContextValue,
	DraftRentalComposerProvider,
} from "./create-draft-rental-composer.context";
import {
	createDraftRentalComposerDefaultValues,
	draftRentalComposerFormSchema,
	toCalculateDraftRentalPriceDto,
	toCreateDraftRentalDto,
} from "./create-draft-rental-composer.schema";

export function CreateRentalPage() {
	const navigate = useNavigate();
	const currentBranchId = useCurrentBranchId();

	const { data: branches } = useBranches();
	const selectedBranch =
		branches?.find((branch) => branch.id === currentBranchId) ?? null;
	const timezone = useSelectedBranchTimezone();
	const createDraftRental = useCreateDraftRental();

	const form = useAppForm({
		defaultValues: createDraftRentalComposerDefaultValues(
			currentBranchId ?? "",
		),
		validators: {
			onSubmit: draftRentalComposerFormSchema,
		},
		onSubmit: async ({ value }) => {
			const body = toCreateDraftRentalDto(value, timezone);
			const response = await createDraftRental.mutateAsync({ body });

			navigate({
				to: "/dashboard/orders/$orderId",
				params: { orderId: response.id },
			});
		},
	});

	const values = useStore(form.store, (state) => state.values);
	const priceBody = buildPriceBody(values, timezone);
	const priceQuery = useCalculatedDraftRentalPrice(priceBody, {
		enabled: !!priceBody,
	});

	const contextValue: DraftRentalComposerContextValue = {
		selectedBranchName: selectedBranch?.name ?? null,
		branchMissing: !currentBranchId,
		timezone,
		pricePreview: priceQuery.data,
		isPriceLoading: priceQuery.isFetching,
		isPriceError: priceQuery.isError,
		isSubmitting: createDraftRental.isPending,
	};

	return (
		<div className="min-h-screen bg-neutral-50 px-8 pb-10 text-neutral-950">
			<PageBreadcrumb
				parent={{ label: "Pedidos", to: "/dashboard/orders" }}
				current="Nuevo borrador"
			/>

			<div className="space-y-1 pb-4">
				<h1 className="text-2xl font-semibold tracking-tight">
					Nuevo borrador
				</h1>
			</div>

			<DraftRentalComposerProvider value={contextValue}>
				{!currentBranchId ? <MissingBranchNotice /> : null}
				<div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
					<div className="space-y-4">
						<DraftRentalSetupSection form={form} />
						<DraftRentalOfferSearchSection form={form} />
						<DraftRentalSelectedOffersSection form={form} />
					</div>

					<aside className="lg:sticky lg:top-6 lg:self-start">
						<DraftRentalReviewPanel form={form} />
					</aside>
				</div>
			</DraftRentalComposerProvider>
		</div>
	);
}

function MissingBranchNotice() {
	return (
		<Card className="mb-4 border-amber-200 bg-amber-50">
			<CardContent className="flex items-center gap-2 py-3 text-sm text-amber-900">
				<AlertCircle className="size-4" />
				Seleccioná una sucursal para crear un nuevo borrador.
			</CardContent>
		</Card>
	);
}

function buildPriceBody(
	values: Parameters<typeof toCalculateDraftRentalPriceDto>[0],
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
