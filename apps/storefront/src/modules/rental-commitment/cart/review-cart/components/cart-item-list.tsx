import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { AlertTriangle, Minus, Plus, Trash2 } from "lucide-react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { groupCartPackageComposition } from "../../package-composition/cart-package-composition.utils";
import type { RentalCartItem } from "../../rental-cart.types";
import { formatCartMoney } from "../cart-money.utils";
import {
	useCartAvailabilityContext,
	useCartBookingFeedbackContext,
	useCartContext,
	useCartPricingContext,
} from "../cart-page.context";

type CartPriceLine = NonNullable<
	ReturnType<typeof useCartPricingContext>["pricing"]
>["lines"][number];

export function CartItemList() {
	const { items, actions } = useCartContext();
	const { unavailableRentalOfferIds } = useCartBookingFeedbackContext();
	const { availableCountByRentalOfferId } = useCartAvailabilityContext();
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
					const availableCount = availableCountByRentalOfferId.get(
						item.rentalOfferId,
					);
					const isQuantityUnavailable =
						availableCount !== undefined && item.quantity > availableCount;
					const isUnavailable =
						unavailableRentalOfferIds.includes(item.rentalOfferId) ||
						isQuantityUnavailable;

					return item.packageComposition?.length ? (
						<CartPackageItem
							key={item.rentalOfferId}
							item={item}
							line={line}
							isUnavailable={isUnavailable}
							availableCount={availableCount}
							actions={actions}
						/>
					) : (
						<CartSingleItem
							key={item.rentalOfferId}
							item={item}
							line={line}
							isUnavailable={isUnavailable}
							availableCount={availableCount}
							actions={actions}
						/>
					);
				})}
			</div>
		</section>
	);
}

function CartSingleItem({
	item,
	line,
	isUnavailable,
	availableCount,
	actions,
}: {
	item: RentalCartItem;
	line?: CartPriceLine;
	isUnavailable: boolean;
	availableCount?: number;
	actions: ReturnType<typeof useCartContext>["actions"];
}) {
	const { pricing } = useCartPricingContext();

	return (
		<article
			className={`grid grid-cols-[72px_minmax(0,1fr)] gap-4 p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center ${
				isUnavailable
					? "bg-destructive/5 ring-1 ring-inset ring-destructive/30"
					: ""
			}`}
		>
			<ItemImage image={item.image} />
			<div className="min-w-0">
				<h3 className="truncate font-semibold">{item.name}</h3>
				<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
					{item.description}
				</p>
				{line && pricing?.currency && (
					<p className="mt-2 text-sm font-bold">
						{formatCartMoney(line.total, pricing.currency, pricing.locale)}
					</p>
				)}
				{isUnavailable ? <AvailabilityNotice /> : null}
			</div>
			<QuantityControls
				item={item}
				availableCount={availableCount}
				actions={actions}
				className="col-start-2 sm:col-start-auto"
			/>
		</article>
	);
}

function CartPackageItem({
	item,
	line,
	isUnavailable,
	availableCount,
	actions,
}: {
	item: RentalCartItem;
	line?: CartPriceLine;
	isUnavailable: boolean;
	availableCount?: number;
	actions: ReturnType<typeof useCartContext>["actions"];
}) {
	const { pricing } = useCartPricingContext();
	const groups = groupCartPackageComposition(item.packageComposition ?? []);

	return (
		<article
			className={
				isUnavailable
					? "bg-destructive/5 ring-1 ring-inset ring-destructive/30"
					: ""
			}
		>
			<header className="grid grid-cols-[72px_minmax(0,1fr)] gap-4 border-b p-4 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center sm:p-5">
				<ItemImage image={item.image} />
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<h3 className="text-lg font-bold">{item.name}</h3>
						<Badge variant="secondary">Combo</Badge>
					</div>
					{item.description && (
						<p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
							{item.description}
						</p>
					)}
					{line && pricing?.currency && (
						<p className="mt-2 text-sm font-bold">
							{formatCartMoney(line.total, pricing.currency, pricing.locale)}
						</p>
					)}
					{isUnavailable ? <AvailabilityNotice /> : null}
				</div>
				<QuantityControls
					item={item}
					availableCount={availableCount}
					actions={actions}
					className="col-start-2 sm:col-start-auto"
				/>
			</header>
			<div className="bg-muted/40 p-4 sm:p-5">
				<div className="space-y-5">
					{groups.map((group) => (
						<section key={group.categoryId ?? "uncategorized"}>
							<h4 className="mb-3 text-xs font-bold uppercase text-muted-foreground">
								{group.categoryName}
							</h4>
							<div className="divide-y border bg-card">
								{group.requirements.map((requirement) => (
									<div
										key={requirement.equipmentTypeId}
										className="grid grid-cols-[minmax(0,1fr)_56px] gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_76px] sm:items-center"
									>
										<p className="self-center text-sm">
											{requirement.equipmentTypeName}
										</p>
										<div className="col-start-2 text-sm text-muted-foreground sm:col-start-auto sm:text-right">
											<p className="mt-1 text-xs font-medium">
												x{requirement.quantityPerItem * item.quantity}
											</p>
										</div>
									</div>
								))}
							</div>
						</section>
					))}
				</div>
			</div>
		</article>
	);
}

function AvailabilityNotice() {
	return (
		<p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-destructive">
			<AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
			No disponible para el período seleccionado
		</p>
	);
}

function ItemImage({ image }: { image: string | null }) {
	return (
		<div className="aspect-square overflow-hidden rounded-lg bg-muted">
			{image && (
				<img
					className="size-full object-contain"
					src={buildR2PublicUrl(image, "catalog") ?? undefined}
					alt=""
				/>
			)}
		</div>
	);
}

function QuantityControls({
	item,
	availableCount,
	actions,
	className,
}: {
	item: RentalCartItem;
	availableCount?: number;
	actions: ReturnType<typeof useCartContext>["actions"];
	className?: string;
}) {
	const { clearUnavailableRentalOfferIds } = useCartBookingFeedbackContext();

	return (
		<div className={`flex items-center gap-1 ${className ?? ""}`}>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label={item.quantity === 1 ? "Quitar" : "Disminuir"}
				onClick={() => {
					clearUnavailableRentalOfferIds();
					item.quantity === 1
						? actions.removeRentalOffer(item.rentalOfferId)
						: actions.decrementRentalOffer(item.rentalOfferId);
				}}
			>
				{item.quantity === 1 ? <Trash2 /> : <Minus />}
			</Button>
			<span className="w-8 text-center font-bold">{item.quantity}</span>
			<Button
				variant="ghost"
				size="icon-sm"
				aria-label="Aumentar"
				disabled={
					availableCount === undefined || item.quantity >= availableCount
				}
				onClick={() => {
					if (availableCount === undefined || item.quantity >= availableCount) {
						return;
					}
					clearUnavailableRentalOfferIds();
					actions.incrementRentalOffer(item.rentalOfferId, availableCount);
				}}
			>
				<Plus />
			</Button>
		</div>
	);
}
