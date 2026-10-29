import type {
	GetRentalsSortByDto,
	GetRentalsSortDirectionDto,
} from "@repo/api-contracts";
import type { Dayjs } from "dayjs";
import type { ParsedRentalListItem } from "@/modules/rentals/rental.queries";
import { getRentalOrderStatusPresentation } from "@/modules/rentals/shared/rental-order-status";
import { getRelativeOrderDateContext } from "@/shared/utils/formatters";
import type { RentalOrdersListSort } from "./components/rental-orders-list.context";

export function getNextRentalSortDirection(
	current: RentalOrdersListSort,
	sortBy: GetRentalsSortByDto,
): GetRentalsSortDirectionDto {
	if (current.sortBy !== sortBy) return sortBy === "createdAt" ? "desc" : "asc";
	return current.sortDirection === "asc" ? "desc" : "asc";
}

export function getRentalListStatus(rental: ParsedRentalListItem, now: Dayjs) {
	const presentation = getRentalOrderStatusPresentation(rental, now);
	if (presentation.status === "IN_PROGRESS") {
		return { ...presentation, label: "Período en curso" };
	}
	if (presentation.status === "FINISHED") {
		return {
			...presentation,
			label: "Período finalizado",
			badgeClassName: "bg-muted text-muted-foreground",
		};
	}
	return presentation;
}

export function getRentalListDate(
	rental: ParsedRentalListItem,
	endpoint: "pickupAt" | "returnAt",
	timezone: string,
	now: Dayjs,
) {
	const value = rental[endpoint].tz(timezone);
	const relative = getRelativeOrderDateContext(value, now.tz(timezone));
	// Scheduled instants do not establish whether pickup or return actually happened.
	const relevantEndpoint = now.isBefore(rental.pickupAt)
		? "pickupAt"
		: "returnAt";
	const isRelevant =
		rental.status === "CONFIRMED" &&
		now.isBefore(rental.returnAt) &&
		endpoint === relevantEndpoint;

	return {
		formatted: value.locale("es").format("D MMM YYYY · HH:mm"),
		relativeLabel: relative.label,
		isRelevant,
		relativeClassName: !isRelevant
			? "text-muted-foreground"
			: relative.isToday
				? "text-amber-700"
				: relative.isFuture
					? "text-depiqo-blue-600"
					: "text-muted-foreground",
	};
}
