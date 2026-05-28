import type {
	CreateOwnerContractDto,
	CreateOwnerDto,
	GetOwnerResponseDto,
	OwnerListResponse,
} from "@repo/schemas";
import {
	queryOptions,
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	createOwner,
	createOwnerContract,
	getOwner,
	getOwners,
} from "./owners.api";

// -----------------------------------------------------
// Key Factory
// -----------------------------------------------------

export const ownerKeys = {
	all: () => ["owners"] as const,
	lists: () => [...ownerKeys.all(), "list"] as const,
	details: () => [...ownerKeys.all(), "detail"] as const,
	detail: (ownerId: string) => [...ownerKeys.details(), ownerId] as const,
};

export const ownerQueries = {
	list: () =>
		queryOptions<OwnerListResponse, ProblemDetailsError>({
			queryKey: ownerKeys.lists(),
			queryFn: () => getOwners(),
		}),
	detail: (ownerId: string) =>
		queryOptions<GetOwnerResponseDto, ProblemDetailsError>({
			queryKey: ownerKeys.detail(ownerId),
			queryFn: () => getOwner({ data: ownerId }),
		}),
};

// -----------------------------------------------------
// Types
// -----------------------------------------------------

type OwnerListQueryOptions<TData = OwnerListResponse> = Omit<
	UseQueryOptions<OwnerListResponse, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type OwnerDetailQueryOptions<TData = GetOwnerResponseDto> = Omit<
	UseQueryOptions<GetOwnerResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type CreateOwnerMutationOptions = Omit<
	UseMutationOptions<string, ProblemDetailsError, CreateOwnerDto>,
	"mutationFn"
>;

type CreateOwnerContractVariables = {
	ownerId: string;
	dto: CreateOwnerContractDto;
};

type CreateOwnerContractMutationOptions = Omit<
	UseMutationOptions<string, ProblemDetailsError, CreateOwnerContractVariables>,
	"mutationFn"
>;

// -----------------------------------------------------
// Hooks
// -----------------------------------------------------

export function useOwners<TData = OwnerListResponse>(
	options?: OwnerListQueryOptions<TData>,
) {
	const { queryKey, queryFn } = ownerQueries.list();

	return useQuery({
		...options,
		queryKey,
		queryFn,
	});
}

export function useOwner<TData = GetOwnerResponseDto>(
	ownerId: string,
	options?: OwnerDetailQueryOptions<TData>,
) {
	const { queryKey, queryFn } = ownerQueries.detail(ownerId);

	return useQuery({
		...options,
		queryKey,
		queryFn,
	});
}

export function useCreateOwner(options?: CreateOwnerMutationOptions) {
	return useMutation<string, ProblemDetailsError, CreateOwnerDto>({
		...options,
		mutationFn: (data) => createOwner({ data }),
		meta: {
			invalidates: ownerKeys.lists(),
		},
	});
}

export function useCreateOwnerContract(
	options?: CreateOwnerContractMutationOptions,
) {
	return useMutation<string, ProblemDetailsError, CreateOwnerContractVariables>(
		{
			...options,
			mutationFn: ({ dto }) => createOwnerContract({ data: { dto } }),
			meta: {
				invalidates: (variables: CreateOwnerContractVariables) =>
					ownerKeys.detail(variables.ownerId),
			},
		},
	);
}
