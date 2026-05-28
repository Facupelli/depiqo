import type {
	GetCalendarDotsQueryDto,
	GetCalendarDotsResponseDto,
	GetOrdersCalendarQueryDto,
	GetOrdersCalendarResponse,
	GetOrdersQueryDto,
	GetOrdersResponseDto,
	GetOrdersScheduleQuery,
	GetOrdersScheduleResponse,
	GetPendingReviewOrdersQueryDto,
	GetPendingReviewOrdersResponseDto,
	OrderCalendarItem,
	OrderListItem,
	OrderPricingPreviewRequestDto,
	OrderPricingPreviewResponseDto,
	OrderSummary,
	PendingReviewOrderListItem,
	ProblemDetails,
	ScheduleEvent,
} from "@repo/schemas";
import {
	keepPreviousData,
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import { fromDateParam, parseTimestamp } from "@/lib/dates/parse";
import { ProblemDetailsError } from "@/shared/errors";
import {
	getCalendarDots,
	getOrderPricingPreview,
	getOrders,
	getOrdersCalendar,
	getOrdersSchedule,
	getPendingReviewOrders,
} from "./orders.api";
import { orderKeys } from "./orders.keys";

// -----------------------------------------------------
// Parsed Types
// -----------------------------------------------------

export type ParsedOrderSummary = Omit<
	OrderSummary,
	"pickupDate" | "returnDate" | "pickupAt" | "returnAt"
> & {
	pickupDate: Dayjs;
	returnDate: Dayjs;
	pickupAt: Dayjs;
	returnAt: Dayjs;
};

export type ParsedScheduleEvent = Omit<ScheduleEvent, "eventAt" | "order"> & {
	eventAt: Dayjs;
	order: ParsedOrderSummary;
};

type ParsedGetOrdersScheduleResponse = {
	events: ParsedScheduleEvent[];
};

export type ParsedOrderCalendarItem = Omit<
	OrderCalendarItem,
	"pickupAt" | "returnAt" | "pickupDate" | "returnDate"
> & {
	pickupAt: Dayjs;
	returnAt: Dayjs;
	pickupDate: Dayjs;
	returnDate: Dayjs;
};

type ParsedGetOrdersCalendarResponse = {
	orders: ParsedOrderCalendarItem[];
};

export type ParsedOrderListItem = Omit<
	OrderListItem,
	"createdAt" | "pickupAt" | "returnAt"
> & {
	createdAt: Dayjs;
	pickupAt: Dayjs;
	returnAt: Dayjs;
};

type ParsedGetOrdersResponse = Omit<GetOrdersResponseDto, "data"> & {
	data: ParsedOrderListItem[];
};

export type ParsedPendingReviewOrderListItem = Omit<
	PendingReviewOrderListItem,
	"createdAt" | "periodStart" | "periodEnd"
> & {
	createdAt: Dayjs;
	periodStart: Dayjs;
	periodEnd: Dayjs;
};

type ParsedGetPendingReviewOrdersResponse = Omit<
	GetPendingReviewOrdersResponseDto,
	"data"
> & {
	data: ParsedPendingReviewOrderListItem[];
};

export const orderQueries = {
	list: <TData = ParsedGetOrdersResponse>(
		params: GetOrdersQueryDto,
		options?: GetOrdersQueryOptions<TData>,
	) =>
		queryOptions<GetOrdersResponseDto, ProblemDetailsError, TData>({
			...options,
			queryKey: orderKeys.list(params),
			queryFn: () => getOrders({ data: params }),
			placeholderData: keepPreviousData,
			select: (raw) => {
				const parsed = parseOrdersResponse(raw);
				return options?.select ? options.select(raw) : (parsed as TData);
			},
		}),
	pendingReviewList: <TData = ParsedGetPendingReviewOrdersResponse>(
		params: GetPendingReviewOrdersQueryDto,
		options?: GetPendingReviewOrdersQueryOptions<TData>,
	) =>
		queryOptions<GetPendingReviewOrdersResponseDto, ProblemDetailsError, TData>(
			{
				...options,
				queryKey: orderKeys.pendingReviewList(params),
				queryFn: () => getPendingReviewOrders({ data: params }),
				placeholderData: keepPreviousData,
				select: (raw) => {
					const parsed = parsePendingReviewOrdersResponse(raw);
					return options?.select ? options.select(raw) : (parsed as TData);
				},
			},
		),
};

// -----------------------------------------------------
// Types
// -----------------------------------------------------

type GetOrdersScheduleQueryOptions<TData = ParsedGetOrdersScheduleResponse> =
	Omit<
		UseQueryOptions<GetOrdersScheduleResponse, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

type GetOrdersQueryOptions<TData = ParsedGetOrdersResponse> = Omit<
	UseQueryOptions<GetOrdersResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type GetOrdersCalendarQueryOptions<TData = ParsedGetOrdersCalendarResponse> =
	Omit<
		UseQueryOptions<GetOrdersCalendarResponse, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

type GetPendingReviewOrdersQueryOptions<
	TData = ParsedGetPendingReviewOrdersResponse,
> = Omit<
	UseQueryOptions<
		GetPendingReviewOrdersResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

type GetCalendarDotsQueryOptions<TData = GetCalendarDotsResponseDto> = Omit<
	UseQueryOptions<GetCalendarDotsResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type OrderPricingPreviewQueryOptions<TData = OrderPricingPreviewResponseDto> =
	Omit<
		UseQueryOptions<OrderPricingPreviewResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------

function parseScheduleResponse(
	raw: GetOrdersScheduleResponse,
): ParsedGetOrdersScheduleResponse {
	return {
		events: raw.events.map((e) => ({
			...e,
			eventAt: requireDayjs(parseTimestamp(e.eventAt), "eventAt"),
			order: {
				...e.order,
				pickupDate: fromDateParam(e.order.pickupDate),
				returnDate: fromDateParam(e.order.returnDate),
				pickupAt: requireDayjs(parseTimestamp(e.order.pickupAt), "pickupAt"),
				returnAt: requireDayjs(parseTimestamp(e.order.returnAt), "returnAt"),
			},
		})),
	};
}

function parseOrdersCalendarResponse(
	raw: GetOrdersCalendarResponse,
): ParsedGetOrdersCalendarResponse {
	return {
		orders: raw.orders.map((order) => ({
			...order,
			pickupAt: requireDayjs(parseTimestamp(order.pickupAt), "pickupAt"),
			returnAt: requireDayjs(parseTimestamp(order.returnAt), "returnAt"),
			pickupDate: fromDateParam(order.pickupDate),
			returnDate: fromDateParam(order.returnDate),
		})),
	};
}

function parseOrdersResponse(
	raw: GetOrdersResponseDto,
): ParsedGetOrdersResponse {
	return {
		...raw,
		data: raw.data.map((order) => ({
			...order,
			createdAt: requireDayjs(parseTimestamp(order.createdAt), "createdAt"),
			pickupAt: requireDayjs(parseTimestamp(order.pickupAt), "pickupAt"),
			returnAt: requireDayjs(parseTimestamp(order.returnAt), "returnAt"),
		})),
	};
}

function parsePendingReviewOrdersResponse(
	raw: GetPendingReviewOrdersResponseDto,
): ParsedGetPendingReviewOrdersResponse {
	return {
		...raw,
		data: raw.data.map((order) => ({
			...order,
			createdAt: requireDayjs(parseTimestamp(order.createdAt), "createdAt"),
			periodStart: requireDayjs(
				parseTimestamp(order.periodStart),
				"periodStart",
			),
			periodEnd: requireDayjs(parseTimestamp(order.periodEnd), "periodEnd"),
		})),
	};
}

// -----------------------------------------------------
// Hooks
// -----------------------------------------------------

export function useUpcomingSchedule<TData = ParsedGetOrdersScheduleResponse>(
	params: GetOrdersScheduleQuery,
	options?: GetOrdersScheduleQueryOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: orderKeys.schedule(params),
		queryFn: () => getOrdersSchedule({ data: params }),
		select: (raw) => {
			const parsed = parseScheduleResponse(raw);
			return options?.select ? options.select(raw) : (parsed as TData);
		},
	});
}

export function useOrders<TData = ParsedGetOrdersResponse>(
	params: GetOrdersQueryDto,
	options?: GetOrdersQueryOptions<TData>,
) {
	const { queryKey, queryFn, select, placeholderData } = orderQueries.list(
		params,
		options,
	);

	return useQuery({
		...options,
		queryKey,
		queryFn,
		select,
		placeholderData,
	});
}

export function useOrdersCalendar<TData = ParsedGetOrdersCalendarResponse>(
	params: GetOrdersCalendarQueryDto,
	options?: GetOrdersCalendarQueryOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: orderKeys.calendar(params),
		queryFn: () => getOrdersCalendar({ data: params }),
		select: (raw) => {
			const parsed = parseOrdersCalendarResponse(raw);
			return options?.select ? options.select(raw) : (parsed as TData);
		},
	});
}

export function usePendingReviewOrders<
	TData = ParsedGetPendingReviewOrdersResponse,
>(
	params: GetPendingReviewOrdersQueryDto,
	options?: GetPendingReviewOrdersQueryOptions<TData>,
) {
	const { queryKey, queryFn, select, placeholderData } =
		orderQueries.pendingReviewList(params, options);

	return useQuery({
		...options,
		queryKey,
		queryFn,
		select,
		placeholderData,
	});
}

export function useCalendarDots<TData = GetCalendarDotsResponseDto>(
	params: GetCalendarDotsQueryDto,
	options?: GetCalendarDotsQueryOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: orderKeys.calendarDot(params),
		queryFn: () => getCalendarDots({ data: params }),
	});
}

export function useOrderPricingPreview<TData = OrderPricingPreviewResponseDto>(
	dto: OrderPricingPreviewRequestDto,
	options?: OrderPricingPreviewQueryOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: orderKeys.pricingPreview(dto),
		queryFn: async () => {
			const result = await getOrderPricingPreview({ data: dto });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}

			return result;
		},
		placeholderData: keepPreviousData,
	});
}

function hasMutationError(
	result: unknown,
): result is { error: ProblemDetails } {
	return typeof result === "object" && result !== null && "error" in result;
}

function requireDayjs(value: Dayjs | null, field: string): Dayjs {
	if (!value) {
		throw new Error(`Invalid order list date: ${field}`);
	}

	return value;
}
