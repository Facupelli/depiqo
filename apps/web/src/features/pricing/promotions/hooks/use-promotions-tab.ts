import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Route } from "@/routes/_admin/dashboard/promotions";
import useDebounce from "@/shared/hooks/use-debounce";
import { usePromotions } from "@/v2/features/pricing/promotions/promotions.queries";

const DEBOUNCE_MS = 300;

export function usePromotionsTab() {
	const navigate = useNavigate({ from: Route.fullPath });
	const { search: urlSearch, activation } = Route.useSearch();

	const [inputValue, setInputValue] = useState(urlSearch ?? "");
	const debouncedSearch = useDebounce(inputValue, DEBOUNCE_MS);

	useEffect(() => {
		const next = debouncedSearch.trim() || undefined;
		navigate({
			search: (prev) => ({
				...prev,
				search: next,
			}),
		});
	}, [debouncedSearch, navigate]);

	function handleActivationChange(next?: "AUTOMATIC" | "COUPON_REQUIRED") {
		navigate({
			search: (prev) => ({
				...prev,
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
		setInputValue,
		query,
		activation,
		handleActivationChange,
	};
}
