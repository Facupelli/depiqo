import {
	type ApproveCustomerProfileDto,
	approveCustomerProfileSchema,
	type CustomerDetailResponseDto,
	type CustomerProfileResponseDto,
	CustomerProfileResponseSchema,
	type CustomerResponseDto,
	type GetCustomersQueryDto,
	type GetPendingCustomerProfilesResponseDto,
	getCustomersQuerySchema,
	getPendingCustomerProfilesResponseSchema,
	type PaginatedDto,
	type PendingCustomerProfileReviewCountResponseDto,
	type ProblemDetails,
	pendingCustomerProfileReviewCountResponseSchema,
	type RejectCustomerProfileDto,
	rejectCustomerProfileSchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import z from "zod";
import {
	authenticatedApiFetch as apiFetch,
	authenticatedApiFetchPaginated as apiFetchPaginated,
} from "@/lib/api-auth";
import { ProblemDetailsError } from "@/shared/errors";

const apiUrl = "/customers";

export const getCustomers = createServerFn({ method: "GET" })
	.inputValidator((data: GetCustomersQueryDto) =>
		getCustomersQuerySchema.parse(data),
	)
	.handler(async ({ data }): Promise<PaginatedDto<CustomerResponseDto>> => {
		const result = await apiFetchPaginated<CustomerResponseDto>(apiUrl, {
			method: "GET",
			params: data,
		});

		return result;
	});

const customerParamsSchema = z.object({
	customerId: z.uuid(),
});

const customerProfileParamsSchema = z.object({
	customerProfileId: z.uuid(),
});

export interface CustomerParams {
	customerId: string;
}

export interface CustomerProfileParams {
	customerProfileId: string;
}

export const getCustomerDetail = createServerFn({ method: "GET" })
	.inputValidator((data: CustomerParams) => customerParamsSchema.parse(data))
	.handler(async ({ data }): Promise<CustomerDetailResponseDto> => {
		return apiFetch<CustomerDetailResponseDto>(`${apiUrl}/${data.customerId}`, {
			method: "GET",
		});
	});

export const getCustomerProfile = createServerFn({ method: "GET" })
	.inputValidator((data: CustomerParams) => customerParamsSchema.parse(data))
	.handler(async ({ data }): Promise<CustomerProfileResponseDto> => {
		const result = await apiFetch<CustomerProfileResponseDto>(
			`${apiUrl}/${data.customerId}/profile`,
			{ method: "GET" },
		);

		return CustomerProfileResponseSchema.parse(result);
	});

export const getPendingCustomerProfiles = createServerFn({
	method: "GET",
}).handler(async (): Promise<GetPendingCustomerProfilesResponseDto> => {
	const result = await apiFetch<GetPendingCustomerProfilesResponseDto>(
		"/customer-profiles/pending",
		{
			method: "GET",
		},
	);

	return getPendingCustomerProfilesResponseSchema.parse(result);
});

export const getPendingCustomerProfileReviewCount = createServerFn({
	method: "GET",
}).handler(async (): Promise<PendingCustomerProfileReviewCountResponseDto> => {
	const result = await apiFetch<PendingCustomerProfileReviewCountResponseDto>(
		"/customer-profiles/pending/count",
		{
			method: "GET",
		},
	);

	return pendingCustomerProfileReviewCountResponseSchema.parse(result);
});

export const approveCustomerProfile = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { customerProfileId: string; dto: ApproveCustomerProfileDto }) => ({
			customerProfileId:
				customerProfileParamsSchema.shape.customerProfileId.parse(
					data.customerProfileId,
				),
			dto: approveCustomerProfileSchema.parse(data.dto),
		}),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(
				`/customer-profiles/${data.customerProfileId}/approve`,
				{
					method: "POST",
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

export const rejectCustomerProfile = createServerFn({ method: "POST" })
	.inputValidator(
		(data: { customerProfileId: string; dto: RejectCustomerProfileDto }) => ({
			customerProfileId:
				customerProfileParamsSchema.shape.customerProfileId.parse(
					data.customerProfileId,
				),
			dto: rejectCustomerProfileSchema.parse(data.dto),
		}),
	)
	.handler(async ({ data }): Promise<void | { error: ProblemDetails }> => {
		try {
			await apiFetch<void>(
				`/customer-profiles/${data.customerProfileId}/reject`,
				{
					method: "POST",
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

export const getCustomerProfileReview = createServerFn({ method: "GET" })
	.inputValidator((data: CustomerProfileParams) =>
		customerProfileParamsSchema.parse(data),
	)
	.handler(async ({ data }): Promise<CustomerProfileResponseDto> => {
		const result = await apiFetch<CustomerProfileResponseDto>(
			`/customer-profiles/${data.customerProfileId}`,
			{ method: "GET" },
		);

		return CustomerProfileResponseSchema.parse(result);
	});
