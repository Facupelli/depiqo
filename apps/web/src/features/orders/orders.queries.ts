import type {
	CreateDraftOrderDto,
	CreateOrderDto,
	DraftOrderPricingProposalRequestDto,
	DraftOrderPricingProposalResponseDto,
	GetCalendarDotsQueryDto,
	GetCalendarDotsResponseDto,
	GetDraftOrderPricingParamDto,
	GetOrderByIdParamDto,
	GetOrdersCalendarQueryDto,
	GetOrdersCalendarResponse,
	GetOrdersQueryDto,
	GetOrdersResponseDto,
	GetOrdersScheduleQuery,
	GetOrdersScheduleResponse,
	OrderCalendarItem,
	OrderListItem,
	OrderPricingPreviewRequestDto,
	OrderPricingPreviewResponseDto,
	OrderSummary,
	ProblemDetails,
	ScheduleEvent,
	UpdateDraftOrderPricingRequestDto,
} from "@repo/schemas";
import {
	keepPreviousData,
	queryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type { Dayjs } from "dayjs";
import { fromDateParam, parseTimestamp } from "@/lib/dates/parse";
import { ProblemDetailsError } from "@/shared/errors";
import {
	cancelOrder,
	confirmOrder,
	createDraftOrder,
	createOrder,
	editOrder,
	getCalendarDots,
	getDraftOrderPricingProposal,
	getOrderPricingPreview,
	getOrders,
	getOrdersCalendar,
	getOrdersSchedule,
	markEquipmentAsRetired,
	markEquipmentAsReturned,
	updateDraftOrder,
	updateDraftOrderPricing,
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

type GetCalendarDotsQueryOptions<TData = GetCalendarDotsResponseDto> = Omit<
	UseQueryOptions<GetCalendarDotsResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type OrderDetailMutationOptions = Omit<
	UseMutationOptions<void, ProblemDetailsError, GetOrderByIdParamDto>,
	"mutationFn"
>;

type OrderMutationOptions = Omit<
	UseMutationOptions<string, ProblemDetailsError, CreateOrderDto>,
	"mutationFn"
>;

type DraftOrderMutationOptions = Omit<
	UseMutationOptions<string, ProblemDetailsError, CreateDraftOrderDto>,
	"mutationFn"
>;

type OrderCompositionMutationOptions = Omit<
	UseMutationOptions<
		void,
		ProblemDetailsError,
		{ orderId: string; data: CreateDraftOrderDto }
	>,
	"mutationFn"
>;

type DraftOrderPricingProposalMutationOptions = Omit<
	UseMutationOptions<
		DraftOrderPricingProposalResponseDto,
		ProblemDetailsError,
		{
			params: GetDraftOrderPricingParamDto;
			dto: DraftOrderPricingProposalRequestDto;
		}
	>,
	"mutationFn"
>;

type UpdateDraftOrderPricingMutationOptions = Omit<
	UseMutationOptions<
		void,
		ProblemDetailsError,
		{
			params: GetDraftOrderPricingParamDto;
			dto: UpdateDraftOrderPricingRequestDto;
		}
	>,
	"mutationFn"
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

export function useCreateOrder(options?: OrderMutationOptions) {
	return useMutation<string, ProblemDetailsError, CreateOrderDto>({
		...options,
		mutationFn: async (data) => {
			const result = await createOrder({ data });
			if (typeof result === "object" && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: orderKeys.all(),
		},
	});
}

export function useCreateDraftOrder(options?: DraftOrderMutationOptions) {
	return useMutation<string, ProblemDetailsError, CreateDraftOrderDto>({
		...options,
		mutationFn: async (data) => {
			const result = await createDraftOrder({ data });
			if (typeof result === "object" && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: orderKeys.all(),
		},
	});
}

export function useUpdateDraftOrder(options?: OrderCompositionMutationOptions) {
	return useMutation<
		void,
		ProblemDetailsError,
		{ orderId: string; data: CreateDraftOrderDto }
	>({
		...options,
		mutationFn: async ({ orderId, data }) => {
			const result = await updateDraftOrder({ data: { orderId, dto: data } });
			if (typeof result === "object" && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: orderKeys.all(),
		},
	});
}

export function useEditOrder(options?: OrderCompositionMutationOptions) {
	return useMutation<
		void,
		ProblemDetailsError,
		{ orderId: string; data: CreateDraftOrderDto }
	>({
		...options,
		mutationFn: async ({ orderId, data }) => {
			const result = await editOrder({ data: { orderId, dto: data } });
			if (typeof result === "object" && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: orderKeys.all(),
		},
	});
}

export function useDraftOrderPricingProposal(
	options?: DraftOrderPricingProposalMutationOptions,
) {
	return useMutation<
		DraftOrderPricingProposalResponseDto,
		ProblemDetailsError,
		{
			params: GetDraftOrderPricingParamDto;
			dto: DraftOrderPricingProposalRequestDto;
		}
	>({
		...options,
		mutationFn: async (data) => {
			const result = await getDraftOrderPricingProposal({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: (variables) =>
				orderKeys.draftPricingProposal(variables.params, variables.dto),
		},
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

export function useUpdateDraftOrderPricing(
	options?: UpdateDraftOrderPricingMutationOptions,
) {
	return useMutation<
		void,
		ProblemDetailsError,
		{
			params: GetDraftOrderPricingParamDto;
			dto: UpdateDraftOrderPricingRequestDto;
		}
	>({
		...options,
		mutationFn: async (data) => {
			const result = await updateDraftOrderPricing({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: (variables) => [
				orderKeys.all(),
				orderKeys.draft(variables.params),
				orderKeys.draftPricingUpdate(variables.params),
			],
		},
	});
}

export function useConfirmOrder(options?: OrderDetailMutationOptions) {
	return useMutation<void, ProblemDetailsError, GetOrderByIdParamDto>({
		...options,
		mutationFn: async (data) => {
			const result = await confirmOrder({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: orderKeys.all(),
		},
	});
}

export function useMarkEquipmentAsReturned(
	options?: OrderDetailMutationOptions,
) {
	return useMutation<void, ProblemDetailsError, GetOrderByIdParamDto>({
		...options,
		mutationFn: async (data) => {
			const result = await markEquipmentAsReturned({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: orderKeys.all(),
		},
	});
}

export function useCancelOrder(options?: OrderDetailMutationOptions) {
	return useMutation<void, ProblemDetailsError, GetOrderByIdParamDto>({
		...options,
		mutationFn: async (data) => {
			const result = await cancelOrder({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: orderKeys.all(),
		},
	});
}

export function useMarkEquipmentAsRetired(
	options?: OrderDetailMutationOptions,
) {
	return useMutation<void, ProblemDetailsError, GetOrderByIdParamDto>({
		...options,
		mutationFn: async (data) => {
			const result = await markEquipmentAsRetired({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: orderKeys.all(),
		},
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
