import { Search } from "lucide-react";
import { startTransition, useEffect, useState } from "react";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useStorefrontCategories } from "@/features/catalog/storefront-categories/storefront-categories.queries";
import type { V2RentalPageSearch } from "@/routes/_portal/_tenant/rental";
import useDebounce from "@/shared/hooks/use-debounce";

interface CategoryFilterProps {
	activeCategory: string | undefined;
	onSelect: (id: string) => void;
}

export function CategoryFilter({
	activeCategory,
	onSelect,
}: CategoryFilterProps) {
	const { data: categories, isFetching } = useStorefrontCategories();

	if (isFetching) {
		const skeletonKeys = ["one", "two", "three", "four", "five"];

		return (
			<div className="hidden md:flex gap-2 pb-4 border-b">
				{skeletonKeys.map((key) => (
					<Skeleton key={key} className="h-9 w-24 rounded-full" />
				))}
			</div>
		);
	}

	if (!categories?.length) {
		return null;
	}

	return (
		<div className="hidden md:flex gap-2 pb-4 overflow-x-auto border-b scrollbar-hide">
			{categories.map((cat) => (
				<Button
					key={cat.id}
					variant={activeCategory === cat.id ? "default" : "ghost"}
					onClick={() => onSelect(cat.id)}
					className="rounded-full shrink-0"
				>
					{cat.name}
				</Button>
			))}
		</div>
	);
}

interface SearchFiltersProps {
	search: V2RentalPageSearch;
	onSearchCommit: (value: string) => void;
}

export function SearchFilter({ search, onSearchCommit }: SearchFiltersProps) {
	const [localSearch, setLocalSearch] = useState(search.search ?? "");
	const debouncedSearch = useDebounce(localSearch, 300);

	useEffect(() => {
		setLocalSearch(search.search ?? "");
	}, [search.search]);

	useEffect(() => {
		if (debouncedSearch === (search.search ?? "")) {
			return;
		}

		// The URL update triggers data fetching, so keep it non-urgent and let the
		// current input value stay responsive while results refresh.
		startTransition(() => {
			onSearchCommit(debouncedSearch);
		});
	}, [debouncedSearch, onSearchCommit, search.search]);

	return (
		<div className="flex flex-col md:flex-row md:items-center gap-y-4 justify-between pt-4">
			<div className="relative transition-all flex-1 max-w-md">
				<Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
				<Input
					type="search"
					placeholder="Buscar equipo..."
					className="pl-8"
					value={localSearch}
					onChange={(e) => setLocalSearch(e.target.value)}
				/>
			</div>
		</div>
	);
}
