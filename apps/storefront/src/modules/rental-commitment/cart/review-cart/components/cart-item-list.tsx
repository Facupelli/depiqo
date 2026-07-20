import { Button } from "@repo/ui/components/button";
import { Minus, Plus, Trash2 } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { formatCurrency } from "@/shared/utils/price.utils";
import { useCartContext, useCartPricingContext } from "../cart-page.context";

export function CartItemList() {
	const { items, actions } = useCartContext();
	const { pricing } = useCartPricingContext();

	return (
		<section className="overflow-hidden rounded-xl border bg-card">
			<div className="border-b px-5 py-4">
				<h2 className="font-bold">Equipos ({items.length})</h2>
			</div>
			<div className="divide-y">
				{items.map((item) => {
					const line = pricing?.lines.find(
						(candidate) => candidate.rentalOfferId === item.rentalOfferId,
					);
					return (
						<article
							key={item.rentalOfferId}
							className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center"
						>
							<div className="aspect-square overflow-hidden rounded-lg bg-muted">
								{item.image && (
									<img
										className="size-full object-contain"
										src={buildR2PublicUrl(item.image, "catalog") ?? undefined}
										alt=""
									/>
								)}
							</div>
							<div className="min-w-0">
								<h3 className="truncate font-semibold">{item.name}</h3>
								<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
									{item.description}
								</p>
								{line && pricing?.currency && (
									<p className="mt-2 text-sm font-bold">
										{formatCurrency(
											Number(line.total),
											pricing.currency,
											pricing.locale,
										)}
									</p>
								)}
							</div>
							<div className="col-start-2 flex items-center gap-1 sm:col-start-auto">
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label={item.quantity === 1 ? "Quitar" : "Disminuir"}
									onClick={() =>
										item.quantity === 1
											? actions.removeRentalOffer(item.rentalOfferId)
											: actions.decrementRentalOffer(item.rentalOfferId)
									}
								>
									{item.quantity === 1 ? <Trash2 /> : <Minus />}
								</Button>
								<span className="w-8 text-center font-bold">
									{item.quantity}
								</span>
								<Button
									variant="ghost"
									size="icon-sm"
									aria-label="Aumentar"
									disabled={
										item.availableCount !== null &&
										item.quantity >= item.availableCount
									}
									onClick={() =>
										actions.incrementRentalOffer(item.rentalOfferId)
									}
								>
									<Plus />
								</Button>
							</div>
						</article>
					);
				})}
			</div>
		</section>
	);
}
