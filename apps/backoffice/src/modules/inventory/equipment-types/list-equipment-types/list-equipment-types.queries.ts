import {
	type ListEquipmentTypesQueryDto,
	ListEquipmentTypesQuerySchema,
	type ListEquipmentTypesResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	listEquipmentTypes,
	normalizeListEquipmentTypesQuery,
} from "./list-equipment-types.api";

export type ListEquipmentTypesQueryOverrides<
	TData = ListEquipmentTypesResponseDto,
> = Omit<
	UseQueryOptions<ListEquipmentTypesResponseDto, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export const listEquipmentTypeKeys = {
	all: () => ["v2", "backoffice", "equipment-types"] as const,
	lists: () => [...listEquipmentTypeKeys.all(), "list"] as const,
	list: (query: ListEquipmentTypesQueryDto) =>
		[
			...listEquipmentTypeKeys.lists(),
			normalizeListEquipmentTypesQuery(query),
		] as const,
};

export function getListEquipmentTypesInputFromQueryKey(
	queryKey: readonly unknown[],
): ListEquipmentTypesQueryDto | undefined {
	const listKeyPrefix = listEquipmentTypeKeys.lists();
	if (
		queryKey.length !== listKeyPrefix.length + 1 ||
		!listKeyPrefix.every((value, index) => queryKey[index] === value)
	) {
		return undefined;
	}

	const result = ListEquipmentTypesQuerySchema.safeParse(queryKey.at(-1));
	return result.success ? result.data : undefined;
}

export const listEquipmentTypeQueries = {
	list: <TData = ListEquipmentTypesResponseDto>(
		query: ListEquipmentTypesQueryDto,
		overrides?: ListEquipmentTypesQueryOverrides<TData>,
	) => {
		const normalizedQuery = normalizeListEquipmentTypesQuery(query);
		return queryOptions<
			ListEquipmentTypesResponseDto,
			ProblemDetailsError,
			TData
		>({
			queryKey: listEquipmentTypeKeys.list(normalizedQuery),
			queryFn: () => listEquipmentTypes(normalizedQuery),
			...overrides,
		});
	},
};

export function useListEquipmentTypes<TData = ListEquipmentTypesResponseDto>(
	query: ListEquipmentTypesQueryDto,
	overrides?: ListEquipmentTypesQueryOverrides<TData>,
) {
	return useQuery(listEquipmentTypeQueries.list(query, overrides));
}
