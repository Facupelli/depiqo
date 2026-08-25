import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
	ChevronLeft,
	ChevronRight,
	ImageIcon,
	Loader2,
	MapPin,
	Minus,
	Plus,
	Search,
} from "lucide-react";
import type {
	AddProductOfferAvailability,
	AddProductOfferOption,
} from "./add-selection.utils";
import { useAddProductDialog } from "./use-add-product-dialog";

interface AddProductDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function AddProductDialog({
	open,
	onOpenChange,
}: AddProductDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Agregar producto</DialogTitle>
					<DialogDescription>
						Agregá un producto al pedido de alquiler confirmado.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<AddProductDialogContent onClose={() => onOpenChange(false)} />
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function AddProductDialogContent({ onClose }: { onClose: () => void }) {
	const dialog = useAddProductDialog({ onClose });

	return (
		<div className="space-y-4">
			<BranchContextLine
				branchName={dialog.branchName}
				state={dialog.branchState}
			/>

			<div className="relative">
				<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
				<Input
					value={dialog.search}
					onChange={(event) => dialog.onSearchChange(event.target.value)}
					placeholder="Buscar productos, kits o paquetes"
					className="pl-9"
				/>
			</div>

			<OfferResults
				options={dialog.offers}
				isPending={dialog.areOffersPending}
				isFetching={dialog.areOffersFetching}
				isError={dialog.areOffersErrored}
				quantity={dialog.quantity}
				onSelectOffer={dialog.onSelectOffer}
				onQuantityChange={dialog.onQuantityChange}
			/>

			{dialog.totalPageCount > 1 ? (
				<div className="flex items-center justify-between">
					<Button
						type="button"
						variant="outline"
						size="icon"
						disabled={dialog.page <= 1 || dialog.areOffersFetching}
						onClick={() => dialog.onPageChange(Math.max(dialog.page - 1, 1))}
						aria-label="Página anterior"
					>
						<ChevronLeft className="size-4" />
					</Button>
					<span className="text-muted-foreground text-xs">
						Página {dialog.page} de {dialog.totalPageCount}
					</span>
					<Button
						type="button"
						variant="outline"
						size="icon"
						disabled={
							dialog.page >= dialog.totalPageCount || dialog.areOffersFetching
						}
						onClick={() =>
							dialog.onPageChange(
								Math.min(dialog.page + 1, dialog.totalPageCount),
							)
						}
						aria-label="Página siguiente"
					>
						<ChevronRight className="size-4" />
					</Button>
				</div>
			) : null}

			{dialog.submitErrorMessage ? (
				<p className="text-destructive text-sm">{dialog.submitErrorMessage}</p>
			) : null}

			<DialogFooter className="gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={dialog.isSubmitting}
				>
					Cancelar
				</Button>
				<Button
					type="button"
					onClick={dialog.onSubmit}
					disabled={dialog.isSubmitDisabled}
				>
					{dialog.isSubmitting ? (
						<Loader2 className="size-4 animate-spin" />
					) : null}
					Agregar al pedido
				</Button>
			</DialogFooter>
		</div>
	);
}

function BranchContextLine({
	branchName,
	state,
}: {
	branchName: string | null;
	state: "loading" | "error" | "ready";
}) {
	let label = branchName;
	if (state === "loading") {
		label = "Cargando sucursal...";
	}
	if (state === "error") {
		label = "No pudimos cargar la sucursal del pedido.";
	}

	return (
		<div className="flex items-center gap-1.5 text-muted-foreground text-xs">
			<MapPin className="size-3.5 shrink-0" />
			<span>Sucursal: {label}</span>
		</div>
	);
}

interface OfferResultsProps {
	options: AddProductOfferOption[];
	isPending: boolean;
	isFetching: boolean;
	isError: boolean;
	quantity: number;
	onSelectOffer: (offerId: string) => void;
	onQuantityChange: (quantity: number) => void;
}

function OfferResults({
	options,
	isPending,
	isFetching,
	isError,
	quantity,
	onSelectOffer,
	onQuantityChange,
}: OfferResultsProps) {
	if (isError) {
		return (
			<p className="rounded-md border border-destructive/30 px-3 py-6 text-center text-destructive text-sm">
				No pudimos cargar los productos.
			</p>
		);
	}

	if (isPending) {
		return (
			<div className="space-y-2">
				<div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
				<div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
				<div className="h-16 animate-pulse rounded-lg bg-neutral-100" />
			</div>
		);
	}

	if (options.length === 0 && !isFetching) {
		return (
			<p className="rounded-md border border-dashed px-3 py-6 text-center text-muted-foreground text-sm">
				No hay resultados para tu búsqueda.
			</p>
		);
	}

	return (
		<div className="max-h-72 space-y-2 overflow-y-auto pr-1">
			{options.map((option) => (
				<OfferCard
					key={option.offer.id}
					option={option}
					quantity={quantity}
					onSelect={() => onSelectOffer(option.offer.id)}
					onQuantityChange={onQuantityChange}
				/>
			))}
		</div>
	);
}

interface OfferCardProps {
	option: AddProductOfferOption;
	quantity: number;
	onSelect: () => void;
	onQuantityChange: (quantity: number) => void;
}

function OfferCard({
	option,
	quantity,
	onSelect,
	onQuantityChange,
}: OfferCardProps) {
	const { offer, availability, availableCount, isAdded, isSelected } = option;
	const isSelectable = availability === "available" && !isAdded;

	return (
		<div
			className={`rounded-lg border p-3 transition-colors ${
				isSelected
					? "border-neutral-900 bg-neutral-50"
					: "border-neutral-200 bg-card"
			} ${isSelectable ? "" : "opacity-60"}`}
		>
			<button
				type="button"
				onClick={isSelectable ? onSelect : undefined}
				disabled={!isSelectable}
				className={`flex w-full items-start gap-3 text-left ${
					isSelectable ? "cursor-pointer" : "cursor-not-allowed"
				}`}
				aria-pressed={isSelected}
			>
				<ProductImage imageUrl={option.imageUrl} />
				<div className="min-w-0 flex-1 space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="truncate font-medium text-sm">{offer.name}</p>
						<Badge variant="outline" className="text-[10px]">
							{offer.kind}
						</Badge>
						{isAdded ? (
							<Badge variant="secondary" className="text-[10px]">
								Ya agregado
							</Badge>
						) : null}
					</div>
					{offer.description ? (
						<p className="line-clamp-1 text-muted-foreground text-xs">
							{offer.description}
						</p>
					) : null}
					<p className="text-muted-foreground text-xs">
						{getAvailabilityLabel(availability, availableCount)}
					</p>
				</div>
			</button>
			{isSelected ? (
				<div className="pt-2 pl-[3.75rem]">
					<QuantityStepper
						value={quantity}
						min={1}
						max={availableCount ?? 1}
						onChange={onQuantityChange}
					/>
				</div>
			) : null}
		</div>
	);
}

function getAvailabilityLabel(
	availability: AddProductOfferAvailability,
	availableCount: number | null,
): string {
	switch (availability) {
		case "checking":
			return "Consultando disponibilidad...";
		case "error":
			return "No pudimos verificar la disponibilidad.";
		case "unavailable":
			return "Disponible: 0 unidades";
		case "available":
			return `Disponible: ${availableCount} ${
				availableCount === 1 ? "unidad" : "unidades"
			}`;
	}
}

function QuantityStepper({
	value,
	min,
	max,
	onChange,
}: {
	value: number;
	min: number;
	max: number;
	onChange: (value: number) => void;
}) {
	return (
		<div className="inline-flex items-center gap-2">
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-7"
				disabled={value <= min}
				onClick={() => onChange(Math.max(value - 1, min))}
				aria-label="Quitar una unidad"
			>
				<Minus className="size-3.5" />
			</Button>
			<span className="min-w-8 text-center font-medium text-sm tabular-nums">
				{value}
			</span>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-7"
				disabled={value >= max}
				onClick={() => onChange(Math.min(value + 1, max))}
				aria-label="Agregar una unidad"
			>
				<Plus className="size-3.5" />
			</Button>
		</div>
	);
}

function ProductImage({ imageUrl }: { imageUrl: string | null }) {
	return (
		<div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-neutral-100">
			{imageUrl ? (
				<img alt="" className="h-full w-full object-cover" src={imageUrl} />
			) : (
				<ImageIcon className="size-5 text-neutral-300" aria-hidden="true" />
			)}
		</div>
	);
}
