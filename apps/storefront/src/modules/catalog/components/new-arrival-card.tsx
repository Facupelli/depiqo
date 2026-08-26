import { buildR2PublicUrl } from "@/lib/r2-public-url";
import type { StorefrontRentalOfferListViewItemDto } from "@/modules/catalog/rental-offers/get-storefront-rental-offer-list-view/get-storefront-rental-offer-list-view.schema";
import { formatCurrency } from "@/shared/utils/price.utils";

interface NewArrivalCardProps {
	product: StorefrontRentalOfferListViewItemDto;
	locale?: string;
}

export function NewArrivalCard({ product, locale }: NewArrivalCardProps) {
	const productImage = buildR2PublicUrl(product.image, "catalog");
	const firstTier = product.pricing?.ratePlan.tiers[0];
	const displayCurrency = product.pricing?.ratePlan.currency;

	return (
		<article className="w-40 shrink-0 snap-start sm:w-44 lg:w-48">
			<div className="aspect-square overflow-hidden rounded-sm bg-white ring-1 ring-black/5">
				{productImage ? (
					<img
						src={productImage}
						alt={product.name}
						loading="lazy"
						decoding="async"
						className="h-full w-full object-contain p-2 transition-transform duration-300 hover:scale-[1.03]"
					/>
				) : (
					<div className="flex h-full items-center justify-center bg-muted/50 px-3 text-center text-xs text-muted-foreground">
						Sin imagen
					</div>
				)}
			</div>
			<div className="pt-3">
				<p className="text-[0.68rem] font-medium tracking-wide text-muted-foreground uppercase">
					Equipo
				</p>
				<h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-medium leading-5 text-foreground">
					{product.name}
				</h3>
				<div className="mt-1.5 text-sm">
					{firstTier && displayCurrency ? (
						<>
							<span className="font-semibold">
								{formatCurrency(
									Number(firstTier.pricePerUnit),
									displayCurrency,
									locale ?? "es-AR",
								)}
							</span>
							<span className="text-xs text-muted-foreground">
								{" "}
								/ {product.pricing?.ratePlan.billingUnit}
							</span>
						</>
					) : (
						<span className="text-xs text-muted-foreground">
							Consultar precio
						</span>
					)}
				</div>
			</div>
		</article>
	);
}
