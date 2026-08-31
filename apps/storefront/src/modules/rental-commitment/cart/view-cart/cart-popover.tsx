import { Button } from "@repo/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Link, useNavigate } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import {
	DateRangePicker,
	type ExactRentalPeriodSelection,
} from "@/modules/catalog/components/date-range-picker";
import type { RentalCatalogSearch } from "@/modules/catalog/rental-catalog-search";
import {
	useRentalCartActions,
	useRentalCartBranchId,
	useRentalCartItemCount,
	useRentalCartItems,
} from "../rental-cart.hooks";

export function CartPopover({ search }: { search?: RentalCatalogSearch }) {
	const items = useRentalCartItems();
	const itemCount = useRentalCartItemCount();
	const actions = useRentalCartActions();
	const cartBranchId = useRentalCartBranchId();
	const navigate = useNavigate({ from: "/rental/" });
	const branchId = cartBranchId ?? search?.branchId;

	function handleRentalPeriodChange(period: ExactRentalPeriodSelection) {
		void navigate({
			search: (previous) => ({
				...previous,
				...period,
				branchId,
				page: 1,
			}),
			replace: true,
			resetScroll: false,
		});
	}

	return (
		<Popover>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="relative gap-2 rounded-full"
					>
						<ShoppingBag /> <span className="hidden sm:inline">Pedido</span>
						{itemCount > 0 && (
							<span className="flex size-5 items-center justify-center rounded-full bg-primary text-[11px] text-primary-foreground">
								{itemCount > 99 ? "99+" : itemCount}
							</span>
						)}
					</Button>
				}
			/>
			<PopoverContent
				align="end"
				className="w-[calc(100vw-2rem)] max-w-sm overflow-hidden p-0"
			>
				<div className="border-b px-5 py-4">
					<p className="text-xs font-bold uppercase tracking-[0.18em]">
						Tu pedido
					</p>
				</div>
				{items.length === 0 ? (
					<div className="grid place-items-center gap-2 px-5 py-10 text-center">
						<ShoppingBag className="size-8 text-muted-foreground/40" />
						<p className="text-sm font-medium">Todavía no agregaste equipos</p>
						<p className="text-xs text-muted-foreground">
							Explorá el catálogo para armar tu alquiler.
						</p>
					</div>
				) : (
					<div className="max-h-72 divide-y overflow-y-auto px-5">
						{items.map((item) => (
							<div
								key={item.rentalOfferId}
								className="flex items-center gap-4 py-4"
							>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-semibold">{item.name}</p>
									<p className="text-xs text-muted-foreground">
										Oferta de alquiler
									</p>
								</div>
								<div className="flex items-center gap-1">
									<Button
										type="button"
										size="icon-sm"
										variant="ghost"
										aria-label={item.quantity === 1 ? "Quitar" : "Disminuir"}
										onClick={() =>
											item.quantity === 1
												? actions.removeRentalOffer(item.rentalOfferId)
												: actions.decrementRentalOffer(item.rentalOfferId)
										}
									>
										{item.quantity === 1 ? <Trash2 /> : <Minus />}
									</Button>
									<span className="w-5 text-center text-sm font-semibold">
										{item.quantity}
									</span>
									<Button
										type="button"
										size="icon-sm"
										variant="ghost"
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
							</div>
						))}
					</div>
				)}
				{items.length > 0 && (
					<div className="border-t p-3">
						{items.length > 0 &&
						branchId &&
						search?.periodStart &&
						search.periodEnd &&
						search.pickupInstant &&
						search.returnInstant &&
						Date.parse(search.returnInstant) > Date.parse(search.pickupInstant) ? (
							<Button
								className="w-full"
								render={
									<Link
										to="/cart"
										search={{
											branchId,
											periodStart: search.periodStart,
											periodEnd: search.periodEnd,
											pickupInstant: search.pickupInstant,
											returnInstant: search.returnInstant,
										}}
									/>
								}
							>
								Revisar pedido
							</Button>
						) : (
							<DateRangePicker
								branchId={branchId}
								pickupDate={search?.periodStart}
								returnDate={search?.periodEnd}
								pickupInstant={search?.pickupInstant}
								returnInstant={search?.returnInstant}
								onChange={handleRentalPeriodChange}
								numberOfMonths={1}
								buttonClassName="w-full justify-center rounded-md bg-primary px-4 py-3 text-primary-foreground hover:bg-primary/90"
								datesButtonClassName="text-primary-foreground"
							/>
						)}
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
}
