import { useNavigate, useSearch } from "@tanstack/react-router";
import {
	ArrowRight,
	Calendar,
	MapPin,
	Minus,
	Package,
	Plus,
	ShoppingBag,
	Trash2,
	X,
} from "lucide-react";
import { startTransition, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { DateRangePicker } from "@/features/rental/catalog/components/date-range-picker";
import dayjs from "@/lib/dates/dayjs";
import { dateParamToLocalDate, localDateToDateParam } from "@/lib/dates/parse";
import { useStorefrontBranches } from "@/v2/features/rental-commitment/branches/branches.queries";
import {
	useV2RentalCartActions,
	useV2RentalCartItemCount,
	useV2RentalCartItems,
} from "@/v2/features/rental-commitment/cart/v2-rental-cart.hooks";
import type { V2RentalCartItem } from "@/v2/features/rental-commitment/cart/v2-rental-cart.types";

export function CartPopover() {
	const itemCount = useV2RentalCartItemCount();

	const [open, setOpen] = useState(false);

	function close() {
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button className="relative flex items-center gap-2 rounded-full bg-black px-4 py-2 text-white hover:bg-neutral-800">
						<span className="relative">
							<ShoppingBag className="h-4 w-4" />
							{itemCount > 0 && (
								<span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[10px] font-bold leading-none text-black">
									{itemCount > 99 ? "99+" : itemCount}
								</span>
							)}
						</span>
						<span className="text-xs font-bold uppercase md:tracking-widest">
							<span className="hidden md:inline-block">Revisar</span> Pedido
						</span>
					</Button>
				}
			/>

			<PopoverContent
				align="center"
				sideOffset={8}
				className="gap-0 z-50 w-[calc(100vw-2rem)] max-w-96 overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl"
			>
				<CartPopoverHeader onClose={close} />
				<CartPopoverContext />
				<CartPopoverItemList />
				<CartPopoverFooter onClose={close} />
			</PopoverContent>
		</Popover>
	);
}

type CartPopoverHeaderProps = {
	onClose: () => void;
};

export function CartPopoverHeader({ onClose }: CartPopoverHeaderProps) {
	return (
		<div className="flex items-center justify-between border-b border-neutral-200 px-3 md:px-5 py-2 md:py-4">
			<span className="text-xs font-bold uppercase tracking-widest text-black">
				Pedido
			</span>
			<button
				type="button"
				onClick={onClose}
				className="text-neutral-400 transition-colors hover:text-black"
				aria-label="Close cart preview"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}

function CartPopoverContext() {
	const { branchId, periodStart, periodEnd } = useSearch({
		from: "/_portal/_tenant/v2/rental/",
	});
	const { data: branches } = useStorefrontBranches();
	const branch = branches?.find((branch) => branch.id === branchId);

	const formatDate = (date: string) => {
		return dayjs(dateParamToLocalDate(date)).format("MM/DD/YYYY");
	};

	return (
		<div className="space-y-4 border-b border-neutral-200 px-3 md:px-5 py-4 md:py-6">
			<div className="flex items-start gap-4">
				<MapPin className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 pb-1">
						Ubicación de retiro
					</p>
					{branch ? (
						<p className="text-sm text-black">{branch.name}</p>
					) : (
						<p className="text-sm text-neutral-300">No seleccionado</p>
					)}
				</div>
			</div>

			<div className="flex items-start gap-3">
				<Calendar className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
				<div>
					<p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 pb-1">
						Perido de Alquiler
					</p>
					{periodStart && periodEnd ? (
						<p className="text-sm text-black">
							{formatDate(periodStart)} — {formatDate(periodEnd)}
						</p>
					) : (
						<p className="text-sm text-neutral-300">
							No seleccionate el periodo
						</p>
					)}
				</div>
			</div>
		</div>
	);
}

function CartPopoverItemList() {
	const items = useV2RentalCartItems();

	if (items.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center gap-3 px-3 md:px-5 py-10">
				<ShoppingBag className="h-8 w-8 text-neutral-200" />
				<div className="text-center">
					<p className="text-xs font-bold uppercase tracking-widest text-neutral-400">
						Tu pedido está vacío
					</p>
					<p className="mt-1 text-xs text-neutral-300">
						Navega el catálogo y agrega equipo para comenzar.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="max-h-64 overflow-y-auto px-3 md:px-5">
			<div className="divide-y divide-neutral-100">
				{items.map((item) => (
					<CartPopoverItem key={item.rentalOfferId} item={item} />
				))}
			</div>
		</div>
	);
}

function CartPopoverItem({ item }: { item: V2RentalCartItem }) {
	const { incrementRentalOffer, decrementRentalOffer, removeRentalOffer } =
		useV2RentalCartActions();

	const atStockLimit =
		item.availableCount !== null ? item.quantity >= item.availableCount : false;

	return (
		<div className="flex items-start justify-between gap-4 py-4 md:py-6">
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-semibold uppercase tracking-wide text-black">
					{item.name}
				</p>

				<div className="mt-0.5 flex items-center gap-1.5">
					<Package className="h-3 w-3 text-neutral-300" />
					<p className="text-[11px] uppercase tracking-wider text-neutral-400">
						Oferta de alquiler
					</p>
				</div>
			</div>

			<div className="flex shrink-0 items-center gap-2">
				{item.quantity === 1 ? (
					<button
						type="button"
						onClick={() => removeRentalOffer(item.rentalOfferId)}
						className="flex size-6 items-center justify-center text-neutral-300 transition-colors hover:text-red-500"
						aria-label="Remove item"
					>
						<Trash2 className="size-4" />
					</button>
				) : (
					<button
						type="button"
						onClick={() => decrementRentalOffer(item.rentalOfferId)}
						className="flex size-6 items-center justify-center text-neutral-300 transition-colors hover:text-black"
						aria-label="Decrease quantity"
					>
						<Minus className="size-4" />
					</button>
				)}

				<span className="w-4 text-center text-sm font-bold text-black">
					{item.quantity}
				</span>

				<button
					type="button"
					onClick={() => incrementRentalOffer(item.rentalOfferId)}
					disabled={atStockLimit}
					className="flex size-6 items-center justify-center text-neutral-300 transition-colors hover:text-black disabled:cursor-not-allowed disabled:opacity-30"
					aria-label="Increase quantity"
				>
					<Plus className="size-4" />
				</button>
			</div>
		</div>
	);
}

type CartPopoverFooterProps = {
	onClose: () => void;
};

export function CartPopoverFooter({ onClose }: CartPopoverFooterProps) {
	const { branchId, periodStart, periodEnd } = useSearch({
		from: "/_portal/_tenant/v2/rental/",
	});
	const navigate = useNavigate({ from: "/v2/rental/" });
	const hasRentalPeriod = Boolean(periodStart && periodEnd);

	function handleRentalPeriodChange(range: DateRange | undefined) {
		startTransition(() => {
			navigate({
				search: (prev) => ({
					...prev,
					periodStart: range?.from
						? localDateToDateParam(range.from)
						: undefined,
					periodEnd: range?.to ? localDateToDateParam(range.to) : undefined,
					page: 1,
				}),
				resetScroll: false,
				replace: true,
			});
		});
	}

	function handleReviewOrder() {
		navigate({
			to: "/cart",
			search: {
				branchId,
				periodStart: periodStart as string,
				periodEnd: periodEnd as string,
			},
		});
		onClose();
	}

	return (
		<div className="border-t border-neutral-200 py-4">
			{hasRentalPeriod ? (
				<Button
					onClick={handleReviewOrder}
					className="flex w-full items-center justify-center gap-2 py-5 rounded-none text-xs font-bold uppercase tracking-widest text-white "
				>
					Revisar Pedido
					<ArrowRight className="h-3.5 w-3.5" />
				</Button>
			) : (
				<DateRangePicker
					branchId={branchId}
					pickupDate={periodStart}
					returnDate={periodEnd}
					onChange={handleRentalPeriodChange}
					numberOfMonths={1}
					buttonClassName="flex w-full min-w-0 justify-center rounded-none border border-neutral-900 bg-neutral-900 px-4 py-5 hover:bg-neutral-800"
					datesButtonClassName="text-white"
				/>
			)}
		</div>
	);
}
