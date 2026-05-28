import type {
	ApproveCustomerProfileDto,
	CustomerDetailResponseDto,
	CustomerProfileResponseDto,
	CustomerResponseDto,
	GetCustomersQueryDto,
	GetPendingCustomerProfilesResponseDto,
	PaginatedDto,
	PendingCustomerProfileReviewCountResponseDto,
	RejectCustomerProfileDto,
} from "@repo/schemas";
import {
	keepPreviousData,
	queryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	type UseSuspenseQueryOptions,
	useMutation,
	useQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { ProblemDetailsError } from "@/shared/errors";
import {
	approveCustomerProfile,
	getCustomerDetail,
	getCustomerProfile,
	getCustomerProfileReview,
	getCustomers,
	getPendingCustomerProfileReviewCount,
	getPendingCustomerProfiles,
	rejectCustomerProfile,
} from "./customer.api";

type PaginatedCustomers = PaginatedDto<CustomerResponseDto>;

// -----------------------------------------------------
// Key Factory
// -----------------------------------------------------

export const customerKeys = {
	all: () => ["customers"] as const,
	lists: () => [...customerKeys.all(), "list"] as const,
	list: (params: GetCustomersQueryDto) =>
		[...customerKeys.lists(), params] as const,
	details: () => [...customerKeys.all(), "detail"] as const,
	detail: (customerId: string) =>
		[...customerKeys.details(), customerId] as const,
	profile: (customerId: string) =>
		[...customerKeys.detail(customerId), "profile"] as const,
	pendingProfileReviewCount: () =>
		[...customerKeys.all(), "pending-profile-review-count"] as const,
	pendingProfiles: () => [...customerKeys.all(), "pending-profiles"] as const,
	profileReviews: () => [...customerKeys.all(), "profile-review"] as const,
	profileReview: (customerProfileId: string) =>
		[...customerKeys.profileReviews(), customerProfileId] as const,
};

export const customerQueries = {
	detail: (customerId: string) =>
		queryOptions<CustomerDetailResponseDto, ProblemDetailsError>({
			queryKey: customerKeys.detail(customerId),
			queryFn: () => getCustomerDetail({ data: { customerId } }),
		}),
	pendingProfileReviewCount: () =>
		queryOptions<
			PendingCustomerProfileReviewCountResponseDto,
			ProblemDetailsError
		>({
			queryKey: customerKeys.pendingProfileReviewCount(),
			queryFn: () => getPendingCustomerProfileReviewCount(),
		}),
	pendingProfiles: () =>
		queryOptions<GetPendingCustomerProfilesResponseDto, ProblemDetailsError>({
			queryKey: customerKeys.pendingProfiles(),
			queryFn: () => getPendingCustomerProfiles(),
		}),
	profileReview: (customerProfileId: string) =>
		queryOptions<CustomerProfileResponseDto, ProblemDetailsError>({
			queryKey: customerKeys.profileReview(customerProfileId),
			queryFn: () => getCustomerProfileReview({ data: { customerProfileId } }),
		}),
};

// -----------------------------------------------------
// Types
// -----------------------------------------------------

type CustomersQueryOptions<TData = PaginatedCustomers> = Omit<
	UseQueryOptions<PaginatedCustomers, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type CustomerDetailQueryOptions<TData = CustomerDetailResponseDto> = Omit<
	UseSuspenseQueryOptions<
		CustomerDetailResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

type CustomerProfileQueryOptions<TData = CustomerProfileResponseDto> = Omit<
	UseQueryOptions<CustomerProfileResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type PendingCustomerProfilesQueryOptions<
	TData = GetPendingCustomerProfilesResponseDto,
> = Omit<
	UseSuspenseQueryOptions<
		GetPendingCustomerProfilesResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

type PendingCustomerProfileReviewCountQueryOptions<
	TData = PendingCustomerProfileReviewCountResponseDto,
> = Omit<
	UseSuspenseQueryOptions<
		PendingCustomerProfileReviewCountResponseDto,
		ProblemDetailsError,
		TData
	>,
	"queryKey" | "queryFn"
>;

type CustomerProfileReviewQueryOptions<TData = CustomerProfileResponseDto> =
	Omit<
		UseQueryOptions<CustomerProfileResponseDto, ProblemDetailsError, TData>,
		"queryKey" | "queryFn"
	>;

type ApproveCustomerProfileMutationOptions = Omit<
	UseMutationOptions<
		void,
		ProblemDetailsError,
		{ customerProfileId: string; dto: ApproveCustomerProfileDto }
	>,
	"mutationFn"
>;

type RejectCustomerProfileMutationOptions = Omit<
	UseMutationOptions<
		void,
		ProblemDetailsError,
		{ customerProfileId: string; dto: RejectCustomerProfileDto }
	>,
	"mutationFn"
>;

// -----------------------------------------------------
// Hooks
// -----------------------------------------------------

export function useCustomers<TData = PaginatedCustomers>(
	params: GetCustomersQueryDto,
	options?: CustomersQueryOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: customerKeys.list(params),
		queryFn: () => getCustomers({ data: params }),
		placeholderData: keepPreviousData,
	});
}

export function useCustomerDetail<TData = CustomerDetailResponseDto>(
	customerId: string,
	options?: CustomerDetailQueryOptions<TData>,
) {
	const { queryKey, queryFn } = customerQueries.detail(customerId);

	return useSuspenseQuery({
		...options,
		queryKey,
		queryFn,
	});
}

export function useCustomerProfile<TData = CustomerProfileResponseDto>(
	customerId: string,
	options?: CustomerProfileQueryOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: customerKeys.profile(customerId),
		queryFn: () => getCustomerProfile({ data: { customerId } }),
	});
}

export function usePendingCustomerProfiles<
	TData = GetPendingCustomerProfilesResponseDto,
>(options?: PendingCustomerProfilesQueryOptions<TData>) {
	const { queryKey, queryFn } = customerQueries.pendingProfiles();

	return useSuspenseQuery({
		...options,
		queryKey,
		queryFn,
	});
}

export function usePendingCustomerProfileReviewCount<
	TData = PendingCustomerProfileReviewCountResponseDto,
>(options?: PendingCustomerProfileReviewCountQueryOptions<TData>) {
	const { queryKey, queryFn } = customerQueries.pendingProfileReviewCount();

	return useSuspenseQuery({
		...options,
		queryKey,
		queryFn,
	});
}

export function useCustomerProfileReview<TData = CustomerProfileResponseDto>(
	customerProfileId: string,
	options?: CustomerProfileReviewQueryOptions<TData>,
) {
	const { queryKey, queryFn } =
		customerQueries.profileReview(customerProfileId);

	return useQuery({
		...options,
		queryKey,
		queryFn,
	});
}

export function useApproveCustomerProfile(
	options?: ApproveCustomerProfileMutationOptions,
) {
	return useMutation<
		void,
		ProblemDetailsError,
		{ customerProfileId: string; dto: ApproveCustomerProfileDto }
	>({
		...options,
		mutationFn: async (data) => {
			const result = await approveCustomerProfile({ data });

			if (typeof result === "object" && result !== null && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: customerKeys.all(),
		},
	});
}

export function useRejectCustomerProfile(
	options?: RejectCustomerProfileMutationOptions,
) {
	return useMutation<
		void,
		ProblemDetailsError,
		{ customerProfileId: string; dto: RejectCustomerProfileDto }
	>({
		...options,
		mutationFn: async (data) => {
			const result = await rejectCustomerProfile({ data });

			if (typeof result === "object" && result !== null && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: customerKeys.all(),
		},
	});
}
