import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { useStore } from "@tanstack/react-form";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { withForm } from "@/shared/contexts/form.context";
import useDebounce from "@/shared/hooks/use-debounce";
import { useDraftRentalComposer } from "../create-draft-rental-composer.context";
import {
	buildDraftRentalPeriod,
	createDraftRentalComposerDefaultValues,
	createDraftRentalSelectedOffer,
	type DraftRentalComposerFormValues,
	type DraftRentalSelectedOfferFormValues,
} from "../create-draft-rental-composer.schema";
import {
	getDraftRentalOfferSearchInputFromQueryKey,
	useDraftRentalOfferSearch,
} from "../draft-rental-offers.queries";
import type {
	DraftRentalOfferSearchItemDto,
	SearchDraftRentalOffersInputDto,
} from "../search-draft-rental-offers/search-draft-rental-offers.schema";

export const DraftRentalOfferSearchSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		const { branchMissing, timezone } = useDraftRentalComposer();
		const values = useStore(form.store, (state) => state.values);

		const [search, setSearch] = useState("");
		const debouncedSearch = useDebounce(search, 250).trim();
		const effectivePeriod = buildEffectiveRentalPeriod(values, timezone);
		const periodReady = effectivePeriod !== null;
		const queryInput: SearchDraftRentalOffersInputDto = {
			branchId: values.branchId || "missing",
			search: debouncedSearch || undefined,
			periodStart: effectivePeriod?.start,
			periodEnd: effectivePeriod?.end,
			page: 1,
			pageSize: 8,
		};

		const query = useDraftRentalOfferSearch(queryInput, {
			enabled: !branchMissing && periodReady && !!values.branchId,
			placeholderData: (previousData, previousQuery) => {
				const previousInput = getDraftRentalOfferSearchInputFromQueryKey(
					previousQuery?.queryKey ?? [],
				);

				return previousInput &&
					isSameDraftOfferCommercialContext(previousInput, queryInput)
					? previousData
					: undefined;
			},
		});
		const offers = query.data?.data ?? [];
		const isCompatibleRefresh = query.isFetching && query.isPlaceholderData;

		function addOffer(offer: DraftRentalOfferSearchItemDto) {
			const current = form.state.values.selectedOffers;
			const existing = current.find(
				(item: DraftRentalSelectedOfferFormValues) =>
					item.rentalOfferId === offer.id,
			);

			if (existing) {
				form.setFieldValue(
					"selectedOffers",
					current.map((item: DraftRentalSelectedOfferFormValues) =>
						item.rentalOfferId === offer.id
							? createDraftRentalSelectedOffer({
									...item,
									quantity: item.quantity + 1,
								})
							: item,
					),
				);
				return;
			}

			form.setFieldValue("selectedOffers", [
				...current,
				createDraftRentalSelectedOffer({
					rentalOfferId: offer.id,
					name: offer.name,
					quantity: 1,
					availableCount: offer.availableCount,
				}),
			]);
		}

		return (
			<Card className="shadow-xs">
				<CardHeader>
					<div className="flex items-center justify-between gap-3">
						<CardTitle className="text-base">Agregar productos</CardTitle>
						{query.isFetching ? (
							<Loader2
								className="size-4 animate-spin text-muted-foreground"
								aria-label={
									isCompatibleRefresh
										? "Actualizando productos"
										: "Cargando productos"
								}
							/>
						) : null}
					</div>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="relative">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
						<Input
							value={search}
							onChange={(event) => setSearch(event.target.value)}
							placeholder="Buscar productos, kits o paquetes"
							className="pl-9"
							disabled={branchMissing || !periodReady}
						/>
					</div>

					<ProductResults
						branchMissing={branchMissing}
						periodReady={periodReady}
						query={query}
						offers={offers}
						onAdd={addOffer}
					/>
				</CardContent>
			</Card>
		);
	},
});

function OfferCard({
	offer,
	onAdd,
}: {
	offer: DraftRentalOfferSearchItemDto;
	onAdd: (offer: DraftRentalOfferSearchItemDto) => void;
}) {
	const unavailable = offer.availableCount === 0;

	return (
		<div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
			<div className="min-w-0 space-y-1">
				<div className="flex items-center gap-2">
					<p className="truncate font-medium text-sm">{offer.name}</p>
					<Badge variant="outline" className="text-[10px]">
						{offer.kind}
					</Badge>
				</div>
				<p className="text-muted-foreground text-xs">
					{offer.availableCount === null
						? "Disponibilidad pendiente"
						: `${offer.availableCount} disponibles`}
				</p>
			</div>
			<Button
				type="button"
				size="sm"
				variant={unavailable ? "outline" : "default"}
				aria-label={`Agregar ${offer.name} al borrador`}
				disabled={unavailable}
				onClick={() => onAdd(offer)}
			>
				<Plus className="size-4" />
			</Button>
		</div>
	);
}

interface ProductResultsProps {
	branchMissing: boolean;
	periodReady: boolean;
	query: { isError: boolean; isFetching: boolean };
	offers: DraftRentalOfferSearchItemDto[];
	onAdd: (offer: DraftRentalOfferSearchItemDto) => void;
}

export function ProductResults({
	branchMissing,
	periodReady,
	query,
	offers,
	onAdd,
}: ProductResultsProps) {
	if (branchMissing || !periodReady) {
		return (
			<EmptyState message="Completá sucursal y período para buscar productos disponibles." />
		);
	}

	if (query.isError) {
		return <ErrorState message="No pudimos cargar los productos." />;
	}

	if (offers.length === 0 && query.isFetching) {
		return <EmptyState message="Cargando productos disponibles..." />;
	}

	if (offers.length === 0) {
		return <EmptyState message="No hay resultados para tu búsqueda." />;
	}

	return (
		<div className="grid gap-2 md:grid-cols-2">
			{offers.map((offer) => (
				<OfferCard key={offer.id} offer={offer} onAdd={onAdd} />
			))}
		</div>
	);
}

function buildEffectiveRentalPeriod(
	values: DraftRentalComposerFormValues,
	timezone: string,
): { start: string; end: string } | null {
	if (!values.periodStartDate || !values.periodEndDate) return null;

	try {
		return buildDraftRentalPeriod(values, timezone);
	} catch {
		return null;
	}
}

function isSameDraftOfferCommercialContext(
	previous: SearchDraftRentalOffersInputDto,
	current: SearchDraftRentalOffersInputDto,
): boolean {
	return (
		previous.branchId === current.branchId &&
		previous.periodStart === current.periodStart &&
		previous.periodEnd === current.periodEnd
	);
}

interface EmptyStateProps {
	message: string;
}

export function EmptyState({ message }: EmptyStateProps) {
	return (
		<p className="rounded-md border border-dashed px-3 py-6 text-center text-muted-foreground text-sm">
			{message}
		</p>
	);
}

interface ErrorStateProps {
	message: string;
}

export function ErrorState({ message }: ErrorStateProps) {
	return (
		<p className="rounded-md border border-destructive/30 px-3 py-6 text-center text-destructive text-sm">
			{message}
		</p>
	);
}
