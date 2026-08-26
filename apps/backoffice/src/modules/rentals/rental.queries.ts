import type {
	GetRentalDetailResponseDto,
	GetRentalsCalendarItemDto,
	GetRentalsCalendarQueryDto,
	GetRentalsCalendarResponseDto,
	GetRentalsItemDto,
	GetRentalsQueryDto,
	GetRentalsResponseDto,
} from "@repo/api-contracts";
import {
	keepPreviousData,
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import dayjs from "@/lib/dates/dayjs";
import { getRentalDetail } from "@/modules/rentals/rental-detail/get-rental-detail/get-rental-detail.api";
import type { ProblemDetailsError } from "@/shared/errors";
import { getRentals } from "./list-rentals/get-rentals.api";
import { getRentalsCalendar } from "./rental-calendar/get-rentals-calendar.api";

export type ParsedRentalListItem = Omit<
	GetRentalsItemDto,
	"createdAt" | "pickupAt" | "returnAt"
> & {
	createdAt: Dayjs;
	pickupAt: Dayjs;
	returnAt: Dayjs;
};

export type ParsedGetRentalsResponse = Omit<GetRentalsResponseDto, "data"> & {
	data: ParsedRentalListItem[];
};

export type RentalsQueryOverrides<TData = ParsedGetRentalsResponse> = Omit<
	UseQueryOptions<GetRentalsResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type ParsedRentalsCalendarItem = Omit<
	GetRentalsCalendarItemDto,
	"createdAt" | "pickupAt" | "returnAt" | "pickupDate" | "returnDate"
> & {
	createdAt: Dayjs;
	pickupDate: Dayjs;
	returnDate: Dayjs;
	pickupAt: Dayjs;
	returnAt: Dayjs;
};

export type ParsedGetRentalsCalendarResponse = ParsedRentalsCalendarItem[];

export type RentalsCalendarQueryOverrides<
	TData = ParsedGetRentalsCalendarResponse,
> = Omit<
	UseQueryOptions<GetRentalsCalendarResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type RentalDetailQueryOverrides<TData = GetRentalDetailResponseDto> =
	Omit<
		UseQueryOptions<GetRentalDetailResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

function parseRentalsResponse(
	response: GetRentalsResponseDto,
): ParsedGetRentalsResponse {
	return {
		...response,
		data: response.data.map((rental) => ({
			...rental,
			createdAt: dayjs.utc(rental.createdAt),
			pickupAt: dayjs.utc(rental.pickupAt),
			returnAt: dayjs.utc(rental.returnAt),
		})),
	};
}

function parseRentalsCalendarResponse(
	response: GetRentalsCalendarResponseDto,
): ParsedGetRentalsCalendarResponse {
	return response.map((rental) => ({
		...rental,
		createdAt: dayjs.utc(rental.createdAt),
		pickupDate: dayjs.utc(rental.pickupDate),
		returnDate: dayjs.utc(rental.returnDate),
		pickupAt: dayjs.utc(rental.pickupAt),
		returnAt: dayjs.utc(rental.returnAt),
	}));
}

export const rentalKeys = {
	all: () => ["v2", "rental-commitment", "rentals"] as const,
	lists: () => [...rentalKeys.all(), "list"] as const,
	list: (query?: GetRentalsQueryDto) =>
		[...rentalKeys.lists(), query ?? {}] as const,
	details: () => [...rentalKeys.all(), "detail"] as const,
	detail: (rentalId: string) => [...rentalKeys.details(), rentalId] as const,
	calendars: () => [...rentalKeys.all(), "calendar"] as const,
	calendar: (query?: GetRentalsCalendarQueryDto) =>
		[...rentalKeys.calendars(), query ?? {}] as const,
};

export const rentalQueries = {
	list: <TData = ParsedGetRentalsResponse>(
		query?: GetRentalsQueryDto,
		overrides?: RentalsQueryOverrides<TData>,
	) =>
		queryOptions<GetRentalsResponseDto, ProblemDetailsError, TData>({
			queryKey: rentalKeys.list(query),
			queryFn: () => getRentals(query),
			placeholderData: keepPreviousData,
			...overrides,
			select: (raw) => {
				const parsed = parseRentalsResponse(raw);
				return overrides?.select ? overrides.select(raw) : (parsed as TData);
			},
		}),
	detail: <TData = GetRentalDetailResponseDto>(
		rentalId: string,
		overrides?: RentalDetailQueryOverrides<TData>,
	) =>
		queryOptions<GetRentalDetailResponseDto, ProblemDetailsError, TData>({
			queryKey: rentalKeys.detail(rentalId),
			queryFn: () => getRentalDetail(rentalId),
			enabled: rentalId.length > 0,
			...overrides,
		}),
	calendar: <TData = ParsedGetRentalsCalendarResponse>(
		query?: GetRentalsCalendarQueryDto,
		overrides?: RentalsCalendarQueryOverrides<TData>,
	) =>
		queryOptions<GetRentalsCalendarResponseDto, ProblemDetailsError, TData>({
			queryKey: rentalKeys.calendar(query),
			queryFn: () => {
				if (!query) {
					throw new Error("query is required to fetch rentals calendar.");
				}

				return getRentalsCalendar(query);
			},
			enabled: !!query,
			...overrides,
			select: (raw) => {
				const parsed = parseRentalsCalendarResponse(raw);
				return overrides?.select ? overrides.select(raw) : (parsed as TData);
			},
		}),
};

export function useRentals<TData = ParsedGetRentalsResponse>(
	query?: GetRentalsQueryDto,
	overrides?: RentalsQueryOverrides<TData>,
) {
	return useQuery(rentalQueries.list(query, overrides));
}

export function useRentalsCalendar<TData = ParsedGetRentalsCalendarResponse>(
	query?: GetRentalsCalendarQueryDto,
	overrides?: RentalsCalendarQueryOverrides<TData>,
) {
	return useQuery(rentalQueries.calendar(query, overrides));
}
