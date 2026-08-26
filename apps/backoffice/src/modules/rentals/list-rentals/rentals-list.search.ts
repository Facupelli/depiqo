import type {
	GetRentalsDateLensDto,
	GetRentalsQueryDto,
	GetRentalsSortByDto,
	GetRentalsSortDirectionDto,
} from "@repo/api-contracts";
import { GetRentalsQuerySchema } from "@repo/api-contracts";

export const ordersListSearchSchema = GetRentalsQuerySchema;

export type OrdersListSearch = GetRentalsQueryDto;

export type OrdersListSort = {
	sortBy: GetRentalsSortByDto;
	sortDirection: GetRentalsSortDirectionDto;
};

export function getDefaultOrdersSort(
	dateLens?: GetRentalsDateLensDto,
): OrdersListSort {
	switch (dateLens) {
		case "UPCOMING":
			return { sortBy: "pickupDate", sortDirection: "asc" };
		case "ACTIVE":
			return { sortBy: "returnDate", sortDirection: "asc" };
		case "PAST":
			return { sortBy: "returnDate", sortDirection: "desc" };
		default:
			return { sortBy: "createdAt", sortDirection: "desc" };
	}
}
