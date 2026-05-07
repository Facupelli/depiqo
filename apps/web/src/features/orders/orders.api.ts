import {
	type CreateDraftOrderDto,
	type CreateOrderDto,
	createDraftOrderSchema,
	createOrderSchema,
	type DraftOrderPricingProposalRequestDto,
	type DraftOrderPricingProposalResponseDto,
	draftOrderPricingProposalRequestSchema,
	draftOrderPricingProposalResponseSchema,
	type GetCalendarDotsQueryDto,
	GetCalendarDotsQuerySchema,
	type GetCalendarDotsResponseDto,
	type GetDraftOrderPricingParamDto,
	type GetOrderByIdParamDto,
	type GetOrdersCalendarQueryDto,
	GetOrdersCalendarQuerySchema,
	type GetOrdersCalendarResponse,
	type GetOrdersQueryDto,
	type GetOrdersResponseDto,
	type GetOrdersScheduleQuery,
	GetOrdersScheduleQuerySchema,
	type GetOrdersScheduleResponse,
	getDraftOrderPricingParamSchema,
	getOrderByIdParamSchema,
	getOrdersQuerySchema,
	type OrderAccessoryPreparationResponseDto,
	type OrderDetailResponseDto,
	type OrderListItem,
	type OrderPricingPreviewRequestDto,
	type OrderPricingPreviewResponseDto,
	orderAccessoryPreparationResponseSchema,
	orderPricingPreviewRequestSchema,
	orderPricingPreviewResponseSchema,
	type ProblemDetails,
	type SaveOrderAccessoryPreparationDto,
	saveOrderAccessoryPreparationSchema,
	type UpdateDraftOrderPricingRequestDto,
	updateDraftOrderPricingRequestSchema,
} from "@repo/schemas";
import { ActorType } from "@repo/types";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	authenticatedApiFetch as apiFetch,
	authenticatedApiFetchPaginated as apiFetchPaginated,
} from "@/lib/api-auth";
import { ProblemDetailsError } from "@/shared/errors";

const apiUrl = "/orders";

export const getOrders = createServerFn({ method: "GET" })
	.inputValidator((data: GetOrdersQueryDto) => getOrdersQuerySchema.parse(data))
	.handler(async ({ data }): Promise<GetOrdersResponseDto> => {
		const result = await apiFetchPaginated<OrderListItem>(apiUrl, {
			method: "GET",
			params: data,
		});

		return result;
	});

export const getOrdersSchedule = createServerFn({ method: "GET" })
	.inputValidator((data: GetOrdersScheduleQuery) =>
		GetOrdersScheduleQuerySchema.parse(data),
	)
	.handler(async ({ data }): Promise<GetOrdersScheduleResponse> => {
		const result = await apiFetch<GetOrdersScheduleResponse>(
			`${apiUrl}/schedule`,
			{
				method: "GET",
				params: data,
			},
		);

		return result;
	});

export const getCalendarDots = createServerFn({ method: "GET" })
	.inputValidator((data: GetCalendarDotsQueryDto) =>
		GetCalendarDotsQuerySchema.parse(data),
	)
	.handler(async ({ data }): Promise<GetCalendarDotsResponseDto> => {
		const result = await apiFetch<GetCalendarDotsResponseDto>(
			`${apiUrl}/calendar-dots`,
			{
				method: "GET",
				params: data,
			},
		);

		return result;
	});

export const getOrdersCalendar = createServerFn({ method: "GET" })
	.inputValidator((data: GetOrdersCalendarQueryDto) =>
		GetOrdersCalendarQuerySchema.parse(data),
	)
	.handler(async ({ data }): Promise<GetOrdersCalendarResponse> => {
		const result = await apiFetch<GetOrdersCalendarResponse>(
			`${apiUrl}/calendar`,
			{
				method: "GET",
				params: data,
			},
		);

		return result;
	});

export const getOrderById = createServerFn({ method: "GET" })
	.inputValidator((data: GetOrderByIdParamDto) =>
		getOrderByIdParamSchema.parse(data),
	)
	.handler(async ({ data }): Promise<OrderDetailResponseDto> => {
		const result = await apiFetch<OrderDetailResponseDto>(
			`${apiUrl}/${data.orderId}`,
			{
				method: "GET",
			},
		);

		return result;
	});

export const getOrderAccessoryPreparation = createServerFn({ method: "GET" })
	.inputValidator((data: GetOrderByIdParamDto) =>
		getOrderByIdParamSchema.parse(data),
	)
	.handler(async ({ data }): Promise<OrderAccessoryPreparationResponseDto> => {
		const result = await apiFetch<OrderAccessoryPreparationResponseDto>(
			`${apiUrl}/${data.orderId}/accessory-preparation`,
			{
				method: "GET",
			},
		);

		return orderAccessoryPreparationResponseSchema.parse(result);
	});

export const createOrder = createServerFn({ method: "POST" })
	.inputValidator((data: CreateOrderDto) => createOrderSchema.parse(data))
	.handler(async ({ data }): Promise<string | { error: ProblemDetails }> => {
		try {
			const result = await apiFetch<string>(apiUrl, {
				method: "POST",
				body: data,
				actorType: ActorType.CUSTOMER,
			});

			return result;
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}
			throw error;
		}
	});

export const createDraftOrder = createServerFn({ method: "POST" })
	.inputValidator((data: CreateDraftOrderDto) =>
		createDraftOrderSchema.parse(data),
	)
	.handler(async ({ data }): Promise<string | { error: ProblemDetails }> => {
		try {
			return await apiFetch<string>(`${apiUrl}/drafts`, {
				method: "POST",
				body: data,
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

const draftOrderPricingProposalInputSchema = z.object({
	params: getDraftOrderPricingParamSchema,
	dto: draftOrderPricingProposalRequestSchema,
});

export const getDraftOrderPricingProposal = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			params: GetDraftOrderPricingParamDto;
			dto: DraftOrderPricingProposalRequestDto;
		}) => draftOrderPricingProposalInputSchema.parse(data),
	)
	.handler(
		async ({
			data,
		}): Promise<
			DraftOrderPricingProposalResponseDto | { error: ProblemDetails }
		> => {
			try {
				const result = await apiFetch<DraftOrderPricingProposalResponseDto>(
					`${apiUrl}/${data.params.orderId}/draft-pricing/proposal`,
					{
						method: "POST",
						body: data.dto,
					},
				);

				return draftOrderPricingProposalResponseSchema.parse(result);
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					return { error: error.problemDetails };
				}

				throw error;
			}
		},
	);

export const getOrderPricingPreview = createServerFn({ method: "POST" })
	.inputValidator((data: OrderPricingPreviewRequestDto) =>
		orderPricingPreviewRequestSchema.parse(data),
	)
	.handler(
		async ({
			data,
		}): Promise<OrderPricingPreviewResponseDto | { error: ProblemDetails }> => {
			try {
				const result = await apiFetch<OrderPricingPreviewResponseDto>(
					`${apiUrl}/pricing/preview`,
					{
						method: "POST",
						body: data,
					},
				);

				return orderPricingPreviewResponseSchema.parse(result);
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					return { error: error.problemDetails };
				}

				throw error;
			}
		},
	);

const updateDraftOrderPricingInputSchema = z.object({
	params: getDraftOrderPricingParamSchema,
	dto: updateDraftOrderPricingRequestSchema,
});

const saveOrderAccessoryPreparationInputSchema = z.object({
	params: getOrderByIdParamSchema,
	dto: saveOrderAccessoryPreparationSchema,
});

export const updateDraftOrderPricing = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			params: GetDraftOrderPricingParamDto;
			dto: UpdateDraftOrderPricingRequestDto;
		}) => updateDraftOrderPricingInputSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.params.orderId}/draft-pricing`, {
				method: "POST",
				body: data.dto,
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

export const saveOrderAccessoryPreparation = createServerFn({ method: "POST" })
	.inputValidator(
		(data: {
			params: GetOrderByIdParamDto;
			dto: SaveOrderAccessoryPreparationDto;
		}) => saveOrderAccessoryPreparationInputSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(
				`${apiUrl}/${data.params.orderId}/accessory-preparation`,
				{
					method: "PUT",
					body: data.dto,
				},
			);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

export const confirmOrder = createServerFn({ method: "POST" })
	.inputValidator((data: GetOrderByIdParamDto) =>
		getOrderByIdParamSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.orderId}/confirm`, {
				method: "POST",
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

export const markEquipmentAsReturned = createServerFn({ method: "POST" })
	.inputValidator((data: GetOrderByIdParamDto) =>
		getOrderByIdParamSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(
				`${apiUrl}/${data.orderId}/mark-equipment-returned`,
				{
					method: "POST",
				},
			);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

export const cancelOrder = createServerFn({ method: "POST" })
	.inputValidator((data: GetOrderByIdParamDto) =>
		getOrderByIdParamSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.orderId}/cancel`, {
				method: "POST",
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

export const markEquipmentAsRetired = createServerFn({ method: "POST" })
	.inputValidator((data: GetOrderByIdParamDto) =>
		getOrderByIdParamSchema.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.orderId}/mark-equipment-retired`, {
				method: "POST",
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

export const updateDraftOrder = createServerFn({ method: "POST" })
	.inputValidator((data: { orderId: string; dto: CreateDraftOrderDto }) =>
		z
			.object({
				orderId: z.string().uuid(),
				dto: createDraftOrderSchema,
			})
			.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/drafts/${data.orderId}`, {
				method: "PUT",
				body: data.dto,
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});

export const editOrder = createServerFn({ method: "POST" })
	.inputValidator((data: { orderId: string; dto: CreateDraftOrderDto }) =>
		z
			.object({
				orderId: z.string().uuid(),
				dto: createDraftOrderSchema,
			})
			.parse(data),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.orderId}/edit`, {
				method: "PUT",
				body: data.dto,
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});
