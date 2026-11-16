import { queryOptions } from "@tanstack/react-query";
import { getRentalConfirmationSummary } from "./get-rental-confirmation-summary.api";

export function rentalConfirmationSummaryOptions(
	rentalId: string,
	version: number,
) {
	return queryOptions({
		queryKey: ["v2", "rentals", "confirmation-summary", rentalId, version],
		queryFn: ({ signal }) => getRentalConfirmationSummary(rentalId, signal),
		staleTime: 0,
		placeholderData: undefined,
		retry: false,
	});
}
