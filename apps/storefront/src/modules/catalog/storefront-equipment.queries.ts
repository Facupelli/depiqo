import { queryOptions, useQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { getStorefrontEquipmentFn } from "./rental-offers/get-storefront-equipment/get-storefront-equipment.functions";
import type { GetStorefrontEquipmentInputDto } from "./rental-offers/get-storefront-equipment/get-storefront-equipment.schema";

function normalizeOptionalSearchValue(value: string | undefined) {
	const normalized = value?.trim();
	return normalized || undefined;
}

export function normalizeStorefrontEquipmentInput(
	input: GetStorefrontEquipmentInputDto,
): GetStorefrontEquipmentInputDto {
	return {
		...input,
		categoryId: normalizeOptionalSearchValue(input.categoryId),
		search: normalizeOptionalSearchValue(input.search),
	};
}

export const storefrontEquipmentKeys = {
	all: () => ["storefront", "catalog", "equipment"] as const,
	lists: () => [...storefrontEquipmentKeys.all(), "list"] as const,
	list: (input: GetStorefrontEquipmentInputDto) =>
		[
			...storefrontEquipmentKeys.lists(),
			normalizeStorefrontEquipmentInput(input),
		] as const,
};

export const storefrontEquipmentQueries = {
	list: (input: GetStorefrontEquipmentInputDto) => {
		const normalizedInput = normalizeStorefrontEquipmentInput(input);
		return queryOptions({
			queryKey: storefrontEquipmentKeys.list(normalizedInput),
			queryFn: () => getStorefrontEquipmentFn({ data: normalizedInput }),
		});
	},
};

type EquipmentCommercialContext = Pick<
	GetStorefrontEquipmentInputDto,
	| "branchId"
	| "periodStart"
	| "periodEnd"
	| "pickupInstant"
	| "returnInstant"
>;

type EquipmentQueryInput = ReturnType<typeof normalizeStorefrontEquipmentInput>;
type EquipmentData = Awaited<ReturnType<typeof getStorefrontEquipmentFn>>;

interface RetainedEquipmentResult {
	context: EquipmentCommercialContext;
	data: EquipmentData;
}

function getCommercialContext(
	input: EquipmentQueryInput,
): EquipmentCommercialContext {
	return {
		branchId: input.branchId,
		periodStart: input.periodStart,
		periodEnd: input.periodEnd,
		pickupInstant: input.pickupInstant,
		returnInstant: input.returnInstant,
	};
}

function isSameCommercialContext(
	left: EquipmentCommercialContext,
	right: EquipmentCommercialContext,
) {
	return (
		left.branchId === right.branchId &&
		left.periodStart === right.periodStart &&
		left.periodEnd === right.periodEnd &&
		left.pickupInstant === right.pickupInstant &&
		left.returnInstant === right.returnInstant
	);
}

function getEquipmentInputFromQueryKey(
	queryKey: readonly unknown[],
): EquipmentQueryInput | undefined {
	const input = queryKey.at(-1);
	if (!input || typeof input !== "object") return undefined;
	return input as EquipmentQueryInput;
}

export function useStorefrontEquipment(input: GetStorefrontEquipmentInputDto) {
	const normalizedInput = normalizeStorefrontEquipmentInput(input);
	const context = getCommercialContext(normalizedInput);
	const retainedResultRef = useRef<RetainedEquipmentResult | undefined>(
		undefined,
	);
	const query = useQuery({
		...storefrontEquipmentQueries.list(normalizedInput),
		placeholderData: (previousData, previousQuery) => {
			const previousInput = getEquipmentInputFromQueryKey(
				previousQuery?.queryKey ?? [],
			);
			return previousInput &&
				isSameCommercialContext(getCommercialContext(previousInput), context)
				? previousData
				: undefined;
		},
	});

	if (
		retainedResultRef.current &&
		!isSameCommercialContext(retainedResultRef.current.context, context)
	) {
		retainedResultRef.current = undefined;
	}

	if (query.isSuccess && !query.isPlaceholderData && query.data) {
		retainedResultRef.current = { context, data: query.data };
	}

	const retainedData = retainedResultRef.current?.data;
	const data = query.data ?? retainedData;
	const isFailedCompatibleRefresh = query.isError && retainedData !== undefined;

	return {
		data,
		isInitialPending: query.isPending && data === undefined,
		isFetching: query.isFetching,
		isInitialError: query.isError && data === undefined,
		isFailedCompatibleRefresh,
		refetch: query.refetch,
	};
}
