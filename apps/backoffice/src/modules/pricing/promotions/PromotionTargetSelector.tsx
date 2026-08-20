import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Check, Search, X } from "lucide-react";
import { useState } from "react";
import { useProducts } from "@/modules/products/list-products/product-list.queries";
import { useCategories } from "@/modules/settings/categories/public";
import useDebounce from "@/shared/hooks/use-debounce";

export type PromotionTargetType = "RENTABLE_ITEM" | "RENTAL_OFFER" | "CATEGORY";

type PromotionTargetSelectorProps = {
	type: PromotionTargetType;
	value: string;
	onValueChange: (value: string) => void;
};

const targetCopy: Record<
	PromotionTargetType,
	{ label: string; searchPlaceholder: string; empty: string }
> = {
	RENTABLE_ITEM: {
		label: "Producto",
		searchPlaceholder: "Buscar producto",
		empty: "No encontramos productos",
	},
	CATEGORY: {
		label: "Categoría",
		searchPlaceholder: "Buscar categoría",
		empty: "No encontramos categorías",
	},
	RENTAL_OFFER: {
		label: "Oferta en sucursal",
		searchPlaceholder: "Buscar producto u oferta",
		empty: "No encontramos ofertas",
	},
};

export function PromotionTargetSelector({
	type,
	value,
	onValueChange,
}: PromotionTargetSelectorProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search, 250).trim();
	const { data: categories = [] } = useCategories({
		enabled: type === "CATEGORY",
	});
	const { data: productsPage, isFetching: isFetchingProducts } = useProducts(
		{
			search: debouncedSearch || undefined,
			page: 1,
			pageSize: 100,
		},
		{ enabled: type !== "CATEGORY" },
	);
	const options = buildOptions(type, categories, productsPage?.data ?? []);
	const selected = options.find((option) => option.value === value);
	const copy = targetCopy[type];

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="w-full min-w-0 justify-start overflow-hidden bg-white"
					/>
				}
			>
				<span className="min-w-0 flex-1 truncate text-left">
					{selected?.label ??
						(value
							? "Selección guardada"
							: `Elegir ${copy.label.toLowerCase()}`)}
				</span>
				{value ? (
					<X
						className="size-4 shrink-0 text-muted-foreground"
						onClick={(event) => {
							event.stopPropagation();
							onValueChange("");
						}}
					/>
				) : null}
			</PopoverTrigger>
			<PopoverContent
				className="w-[min(24rem,var(--anchor-width))] p-2"
				align="start"
			>
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder={copy.searchPlaceholder}
						className="bg-white pl-9"
					/>
				</div>
				<div className="mt-2 max-h-64 space-y-1 overflow-auto">
					{options.map((option) => (
						<button
							type="button"
							key={option.value}
							onClick={() => {
								onValueChange(option.value);
								setOpen(false);
							}}
							className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted"
						>
							<span className="min-w-0">
								<span className="block truncate font-medium">
									{option.label}
								</span>
								{option.description ? (
									<span className="block truncate text-muted-foreground text-xs">
										{option.description}
									</span>
								) : null}
							</span>
							{value === option.value ? (
								<Check className="size-4 shrink-0" />
							) : null}
						</button>
					))}
					{options.length === 0 ? (
						<p className="px-2 py-6 text-center text-muted-foreground text-sm">
							{isFetchingProducts ? "Buscando..." : copy.empty}
						</p>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	);
}

type Option = { value: string; label: string; description?: string };

function buildOptions(
	type: PromotionTargetType,
	categories: { id: string; name: string }[],
	products: {
		id: string;
		name: string;
		offers: { rentalOfferId: string; branchName: string | null }[];
	}[],
): Option[] {
	if (type === "CATEGORY") {
		return categories.map((category) => ({
			value: category.id,
			label: category.name,
		}));
	}

	if (type === "RENTABLE_ITEM") {
		return products.map((product) => ({
			value: product.id,
			label: product.name,
		}));
	}

	return products.flatMap((product) =>
		product.offers.map((offer) => ({
			value: offer.rentalOfferId,
			label: product.name,
			description: offer.branchName ?? "Sucursal sin nombre",
		})),
	);
}
