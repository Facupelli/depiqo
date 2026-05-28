import {
	type CreatePromotionDto,
	createPromotionSchema,
	type ListPromotionsQueryDto,
	type ListPromotionsResponseDto,
	listPromotionsQuerySchema,
	listPromotionsResponseSchema,
	type ProblemDetails,
	type PromotionView,
	promotionViewSchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import {
	authenticatedApiFetch as apiFetch,
	authenticatedApiFetchPaginated as apiFetchPaginated,
} from "@/lib/api-auth";
import { ProblemDetailsError } from "@/shared/errors";

const apiUrl = "/pricing/promotions";

export const getPromotions = createServerFn({ method: "GET" })
	.inputValidator((data: ListPromotionsQueryDto) =>
		listPromotionsQuerySchema.parse(data),
	)
	.handler(async ({ data }): Promise<ListPromotionsResponseDto> => {
		const result = await apiFetchPaginated<
			ListPromotionsResponseDto["data"][number]
		>(apiUrl, {
			method: "GET",
			params: data,
		});

		return listPromotionsResponseSchema.parse(result);
	});

export const createPromotion = createServerFn({ method: "POST" })
	.inputValidator((data: CreatePromotionDto) =>
		createPromotionSchema.parse(data),
	)
	.handler(async ({ data }): Promise<string | { error: ProblemDetails }> => {
		try {
			return await apiFetch<string>(apiUrl, {
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

export const getPromotion = createServerFn({ method: "GET" })
	.inputValidator((data: { promotionId: string }) => data)
	.handler(async ({ data }): Promise<PromotionView> => {
		const result = await apiFetch<PromotionView>(
			`${apiUrl}/${data.promotionId}`,
			{
				method: "GET",
			},
		);

		return promotionViewSchema.parse(result);
	});

export const updatePromotion = createServerFn({ method: "POST" })
	.inputValidator((data: { promotionId: string; dto: CreatePromotionDto }) => ({
		promotionId: data.promotionId,
		dto: createPromotionSchema.parse(data.dto),
	}))
	.handler(async ({ data }): Promise<undefined | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.promotionId}`, {
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

export const deletePromotion = createServerFn({ method: "POST" })
	.inputValidator((data: { promotionId: string }) => data)
	.handler(async ({ data }): Promise<undefined | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(`${apiUrl}/${data.promotionId}`, {
				method: "DELETE",
			});
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				return { error: error.problemDetails };
			}

			throw error;
		}
	});
