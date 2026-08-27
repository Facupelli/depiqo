import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { ChevronDown, Minus, Plus } from "lucide-react";
import { useState } from "react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/storefront-rental-offer-list-view.schema";
import { useRentalOfferCartState } from "@/modules/rental-commitment/cart/add-rental-offer/use-rental-offer-cart-state";
import { formatCurrency } from "@/shared/utils/price.utils";

type PackageComposition = NonNullable<
	StorefrontRentalOfferListViewItemDto["packageComposition"]
>;
type PackageCompositionItem = PackageComposition[number];

interface CompositionGroup {
	category: PackageCompositionItem["category"];
	items: PackageComposition;
}

function groupAdjacentComposition(
	composition: PackageComposition,
): CompositionGroup[] {
	return composition.reduce<CompositionGroup[]>((groups, item) => {
		const previousGroup = groups.at(-1);
		const categoryId = item.category?.id ?? null;
		const previousCategoryId = previousGroup?.category?.id ?? null;

		if (previousGroup && previousCategoryId === categoryId) {
			previousGroup.items.push(item);
			return groups;
		}

		groups.push({ category: item.category, items: [item] });
		return groups;
	}, []);
}

function PackageCompositionList({
	composition,
}: {
	composition: PackageComposition;
}) {
	const groups = groupAdjacentComposition(composition);

	return (
		<div className="max-h-72 space-y-4 overflow-x-hidden overflow-y-auto border-t pt-4 pr-2">
			{groups.map((group, groupIndex) => (
				<div
					key={`${group.category?.id ?? "uncategorized"}-${groupIndex}`}
					className="space-y-1.5"
				>
					{group.category && (
						<p className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
							{group.category.name}
						</p>
					)}
					<ul className="space-y-1 text-sm">
						{group.items.map((item) => (
							<li key={item.equipmentTypeId}>
								{item.quantityPerItem}x {item.equipmentTypeName}
							</li>
						))}
					</ul>
				</div>
			))}
		</div>
	);
}

export function PackageCard({
	product,
	locale,
	branchId,
	layout = "compact",
}: {
	product: StorefrontRentalOfferListViewItemDto;
	locale: string | undefined;
	branchId: string;
	layout?: "wide" | "compact";
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const cart = useRentalOfferCartState(branchId, product);
	const unitPrice = product.pricing
		? Number(product.pricing.ratePlan.tiers[0].pricePerUnit)
		: null;
	const displayCurrency = product.pricing?.ratePlan.currency;
	const productImage = buildR2PublicUrl(product.image, "catalog");
	const composition =
		(product.packageComposition?.length ?? 0) > 0
			? product.packageComposition
			: undefined;
	const equipmentCount = composition?.reduce(
		(total, item) => total + item.quantityPerItem,
		0,
	);
	const categoryCount = composition
		? new Set(
				composition.flatMap((item) =>
					item.category ? [item.category.id] : [],
				),
			).size
		: null;

	return (
		<Card className="w-full self-start overflow-hidden rounded-xs py-0 pb-5">
			<div
				className={`relative overflow-hidden bg-gray-100 ${layout === "wide" ? "aspect-video" : "aspect-4/3"}`}
			>
				{productImage ? (
					<img
						src={productImage}
						alt={product.name}
						loading="lazy"
						decoding="async"
						className="h-full w-full object-contain"
					/>
				) : (
					<div className="flex h-full w-full items-center justify-center bg-muted">
						<span className="text-sm text-muted-foreground">Sin imagen</span>
					</div>
				)}
			</div>

			<CardHeader className="gap-2">
				<div className="flex items-start justify-between gap-4">
					<CardTitle className="min-w-0 text-lg leading-tight">
						{product.name}
					</CardTitle>
					<div className="shrink-0 text-right">
						{unitPrice != null && product.pricing && displayCurrency ? (
							<>
								<span className="font-bold">
									{formatCurrency(
										unitPrice,
										displayCurrency,
										locale ?? "es-AR",
									)}
								</span>
								<span className="text-xs text-muted-foreground">
									{" "}
									/ {product.pricing.ratePlan.billingUnit}
								</span>
							</>
						) : (
							<span className="text-sm text-muted-foreground">Contactanos</span>
						)}
					</div>
				</div>
				{composition && equipmentCount != null && categoryCount != null && (
					<p className="text-sm text-muted-foreground">
						{equipmentCount} {equipmentCount === 1 ? "equipo" : "equipos"} ·{" "}
						{categoryCount} {categoryCount === 1 ? "categoría" : "categorías"}
					</p>
				)}
			</CardHeader>

			{composition && (
				<CardContent className="space-y-4">
					<Button
						type="button"
						variant="ghost"
						className="h-auto w-full justify-between bg-transparent px-0 py-1 font-medium hover:bg-transparent active:bg-transparent aria-expanded:bg-transparent focus-visible:bg-transparent"
						aria-expanded={isExpanded}
						onClick={() => setIsExpanded((expanded) => !expanded)}
					>
						{isExpanded ? "Ver menos" : "Ver qué incluye"}
						<ChevronDown
							className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
						/>
					</Button>
					{isExpanded && <PackageCompositionList composition={composition} />}
				</CardContent>
			)}

			<CardFooter>
				{cart.isInCart ? (
					<div className="flex w-full items-center justify-center gap-1 rounded-full border bg-background p-1">
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Disminuir cantidad"
							onClick={cart.decrement}
						>
							<Minus />
						</Button>
						<span className="min-w-6 text-center text-sm font-semibold">
							{cart.quantity}
						</span>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label="Aumentar cantidad"
							disabled={!cart.canIncrement}
							onClick={cart.increment}
						>
							<Plus />
						</Button>
					</div>
				) : (
					<Button
						type="button"
						disabled={cart.unavailable}
						onClick={cart.add}
						className="w-full"
					>
						Reservar combo
					</Button>
				)}
			</CardFooter>
		</Card>
	);
}
