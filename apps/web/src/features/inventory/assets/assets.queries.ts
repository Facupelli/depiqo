import type {
	CreateAssetAssignmentsResponseDto,
	CreateAssetDto,
	CreateBlackoutAssignmentsDto,
	CreateMaintenanceAssignmentsDto,
	GetAssetsQuery,
	GroupedAssetsResponseDto,
	UpdateAssetDto,
} from "@repo/schemas";
import {
	keepPreviousData,
	type UseMutationOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
} from "@tanstack/react-query";
import { ProblemDetailsError } from "@/shared/errors";
import {
	createAsset,
	createBlackoutAssignments,
	createMaintenanceAssignments,
	deactivateAsset,
	deleteAsset,
	getAssets,
	updateAsset,
} from "./assets.api";

type GroupedAssets = GroupedAssetsResponseDto;

// -----------------------------------------------------
// Key Factory
// -----------------------------------------------------

export const assetKeys = {
	all: () => ["assets"] as const,
	lists: () => [...assetKeys.all(), "list"] as const,
	list: (params: GetAssetsQuery) => [...assetKeys.lists(), params] as const,
};

// -----------------------------------------------------
// Types
// -----------------------------------------------------

type AssetsOptions<TData = GroupedAssets> = Omit<
	UseQueryOptions<GroupedAssets, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type AssetMutationOptions = Omit<
	UseMutationOptions<string, ProblemDetailsError, CreateAssetDto>,
	"mutationFn"
>;

type UpdateAssetMutationOptions = Omit<
	UseMutationOptions<
		void,
		ProblemDetailsError,
		{ assetId: string; dto: UpdateAssetDto }
	>,
	"mutationFn"
>;

type AssetActionMutationOptions = Omit<
	UseMutationOptions<void, ProblemDetailsError, { assetId: string }>,
	"mutationFn"
>;

type AssetAssignmentsMutationOptions<TVariables> = Omit<
	UseMutationOptions<
		CreateAssetAssignmentsResponseDto,
		ProblemDetailsError,
		TVariables
	>,
	"mutationFn"
>;

// -----------------------------------------------------
// Hooks
// -----------------------------------------------------

export function useAssets<TData = GroupedAssets>(
	params: GetAssetsQuery = {},
	options?: AssetsOptions<TData>,
) {
	return useQuery({
		...options,
		queryKey: assetKeys.list(params),
		queryFn: () => getAssets({ data: params }),
		placeholderData: keepPreviousData,
	});
}

export function useCreateAsset(options?: AssetMutationOptions) {
	return useMutation<string, ProblemDetailsError, CreateAssetDto>({
		...options,
		mutationFn: async (data) => {
			const result = await createAsset({ data });
			if (typeof result === "object" && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: assetKeys.lists(),
		},
	});
}

export function useUpdateAsset(options?: UpdateAssetMutationOptions) {
	return useMutation<
		void,
		ProblemDetailsError,
		{ assetId: string; dto: UpdateAssetDto }
	>({
		...options,
		mutationFn: async (data) => {
			const result = await updateAsset({ data });
			if (typeof result === "object" && result !== null && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: assetKeys.lists(),
		},
	});
}

export function useDeleteAsset(options?: AssetActionMutationOptions) {
	return useMutation<void, ProblemDetailsError, { assetId: string }>({
		...options,
		mutationFn: async (data) => {
			const result = await deleteAsset({ data });
			if (typeof result === "object" && result !== null && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: assetKeys.lists(),
		},
	});
}

export function useDeactivateAsset(options?: AssetActionMutationOptions) {
	return useMutation<void, ProblemDetailsError, { assetId: string }>({
		...options,
		mutationFn: async (data) => {
			const result = await deactivateAsset({ data });
			if (typeof result === "object" && result !== null && "error" in result) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: assetKeys.lists(),
		},
	});
}

export function useCreateBlackoutAssignments(
	options?: AssetAssignmentsMutationOptions<CreateBlackoutAssignmentsDto>,
) {
	return useMutation<
		CreateAssetAssignmentsResponseDto,
		ProblemDetailsError,
		CreateBlackoutAssignmentsDto
	>({
		...options,
		mutationFn: async (data) => {
			const result = await createBlackoutAssignments({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: assetKeys.lists(),
		},
	});
}

export function useCreateMaintenanceAssignments(
	options?: AssetAssignmentsMutationOptions<CreateMaintenanceAssignmentsDto>,
) {
	return useMutation<
		CreateAssetAssignmentsResponseDto,
		ProblemDetailsError,
		CreateMaintenanceAssignmentsDto
	>({
		...options,
		mutationFn: async (data) => {
			const result = await createMaintenanceAssignments({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
			return result;
		},
		meta: {
			invalidates: assetKeys.lists(),
		},
	});
}

function hasMutationError(
	result:
		| CreateAssetAssignmentsResponseDto
		| { error: ProblemDetailsError["problemDetails"] },
): result is { error: ProblemDetailsError["problemDetails"] } {
	return typeof result === "object" && result !== null && "error" in result;
}
