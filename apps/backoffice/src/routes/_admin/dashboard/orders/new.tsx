import { useStore } from "@tanstack/react-form";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertCircle } from "lucide-react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { Card, CardContent } from "@repo/ui/components/card";
import { useCalculatedDraftRentalPrice } from "@/features/pricing/calculate-draft-rental-price/calculate-draft-rental-price.queries";
import { useCreateDraftRental } from "@/features/rental-commitment/draft-rentals/create-draft-rental/create-draft-rental.mutation";
import { DraftRentalOfferSearchSection } from "@/features/rental-commitment/draft-rentals/create-draft-rental-composer/components/draft-rental-offer-search-section";
import { DraftRentalReviewPanel } from "@/features/rental-commitment/draft-rentals/create-draft-rental-composer/components/draft-rental-review-panel";
import { DraftRentalSelectedOffersSection } from "@/features/rental-commitment/draft-rentals/create-draft-rental-composer/components/draft-rental-selected-offers-section";
import { DraftRentalSetupSection } from "@/features/rental-commitment/draft-rentals/create-draft-rental-composer/components/draft-rental-setup-section";
import {
	type DraftRentalComposerContextValue,
	DraftRentalComposerProvider,
} from "@/features/rental-commitment/draft-rentals/create-draft-rental-composer/create-draft-rental-composer.context";
import {
	createDraftRentalComposerDefaultValues,
	draftRentalComposerFormSchema,
	toCalculateDraftRentalPriceDto,
	toCreateDraftRentalDto,
} from "@/features/rental-commitment/draft-rentals/create-draft-rental-composer/create-draft-rental-composer.schema";
import { useBranches } from "@/features/tenant-management/branch/branch.queries";
import { useCurrentTenant } from "@/features/tenant-management/tenant/tenant.queries";
import { useAppForm } from "@/shared/contexts/form.context";
import { useLocationId } from "@/shared/contexts/location/location.hooks";

export const Route = createFileRoute("/_admin/dashboard/orders/new")({
	component: NewDraftOrderPage,
});

function NewDraftOrderPage() {
	const navigate = useNavigate();
	const locationId = useLocationId();

	const { data: tenant } = useCurrentTenant();
	const { data: branches } = useBranches();

	const selectedBranch =
		branches?.find((branch) => branch.id === locationId) ?? null;
	const timezone = selectedBranch?.timezone ?? tenant?.config.timezone ?? "UTC";
	const createDraftRental = useCreateDraftRental();

	const form = useAppForm({
		defaultValues: createDraftRentalComposerDefaultValues(locationId ?? ""),
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
		branchMissing: !locationId,
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
				{!locationId ? <MissingBranchNotice /> : null}
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
