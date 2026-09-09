import { useDebouncer } from "@tanstack/react-pacer";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { usePromotions } from "@/modules/pricing/promotions/promotion.queries";
import { Route } from "@/routes/_admin/dashboard/promotions";

const DEBOUNCE_MS = 300;

type SearchDraft = {
	value: string;
	basedOnAppliedValue: string;
};

export function usePromotionsTab() {
	const navigate = useNavigate({ from: Route.fullPath });
	const { search: urlSearch, activation } = Route.useSearch();
	const appliedSearchValue = urlSearch ?? "";
	const [searchDraft, setSearchDraft] = useState<SearchDraft>({
		value: appliedSearchValue,
		basedOnAppliedValue: appliedSearchValue,
	});
	const searchDebouncer = useDebouncer(
		({ value, basedOnAppliedValue }: SearchDraft) => {
			if (appliedSearchValue !== basedOnAppliedValue) return;

			const nextSearch = value.trim() || undefined;
			if (nextSearch === urlSearch) return;

			navigate({
				search: (previous) => ({
					...previous,
					search: nextSearch,
				}),
			});
		},
		{ wait: DEBOUNCE_MS },
	);
	const inputValue =
		searchDraft.basedOnAppliedValue === appliedSearchValue
			? searchDraft.value
			: appliedSearchValue;

	function handleSearchChange(value: string) {
		const nextDraft = {
			value,
			basedOnAppliedValue: appliedSearchValue,
		};
		setSearchDraft(nextDraft);
		searchDebouncer.maybeExecute(nextDraft);
	}

	function handleActivationChange(next?: "AUTOMATIC" | "COUPON_REQUIRED") {
		navigate({
			search: (previous) => ({
				...previous,
				activation: next,
			}),
		});
	}

	const query = usePromotions({
		search: urlSearch,
		activation,
	});

	return {
		inputValue,
		handleSearchChange,
		query,
		activation,
		handleActivationChange,
	};
}
