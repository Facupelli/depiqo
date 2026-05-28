import { useStore } from "@tanstack/react-form";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { withForm } from "@/shared/contexts/form.context";
import useDebounce from "@/shared/hooks/use-debounce";
import { useDraftRentalOfferSearch } from "../../draft-rental-offers.queries";
import type { DraftRentalOfferSearchItemDto } from "../../search-draft-rental-offers/search-draft-rental-offers.schema";
import { useDraftRentalComposer } from "../create-draft-rental-composer.context";
import {
	createDraftRentalComposerDefaultValues,
	createDraftRentalSelectedOffer,
	type DraftRentalSelectedOfferFormValues,
} from "../create-draft-rental-composer.schema";

export const DraftRentalOfferSearchSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		const { branchMissing } = useDraftRentalComposer();
		const values = useStore(form.store, (state) => state.values);

		const [search, setSearch] = useState("");
		const debouncedSearch = useDebounce(search, 250).trim();
		const periodReady = Boolean(values.periodStartDate && values.periodEndDate);

		const query = useDraftRentalOfferSearch(
			{
				branchId: values.branchId || "missing",
				search: debouncedSearch || undefined,
				periodStart: values.periodStartDate
					? new Date(values.periodStartDate).toISOString()
					: undefined,
				periodEnd: values.periodEndDate
					? new Date(values.periodEndDate).toISOString()
					: undefined,
				page: 1,
				pageSize: 8,
			},
			{ enabled: !branchMissing && periodReady && !!values.branchId },
		);
		const offers = query.data?.data ?? [];

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
							<Loader2 className="size-4 animate-spin text-muted-foreground" />
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
	query: { isError: boolean; isFetching: boolean }; // swap for your real query result type
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

	if (offers.length === 0 && !query.isFetching) {
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
