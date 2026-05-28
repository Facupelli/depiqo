import type {
	AddScheduleToLocationDto,
	GetLocationScheduleSlotsQueryDto,
	LocationScheduleResponseDto,
	LocationScheduleSlotsResponse,
} from "@repo/schemas";
import {
	type MutationOptions,
	queryOptions,
	type UseQueryOptions,
	useMutation,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import {
	bulkCreateLocationSchedules,
	createLocationSchedule,
	getLocationScheduleSlots,
	getLocationSchedules,
	getRentalLocationSchedules,
	updateLocationSchedule,
} from "./location-schedules.api";

// ---------------------------------------------------------------------------

export type LocationSchedulesQueryOverrides<
	TData = LocationScheduleResponseDto[],
> = Omit<
	UseQueryOptions<LocationScheduleResponseDto[], ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

export type LocationScheduleSlotsQueryOverrides<
	TData = LocationScheduleSlotsResponse,
> = Omit<
	UseQueryOptions<LocationScheduleSlotsResponse, ProblemDetailsError, TData>,
	"queryKey" | "queryFn"
>;

type CreateScheduleMutationOptions = Omit<
	MutationOptions<
		LocationScheduleResponseDto,
		ProblemDetailsError,
		{ locationId: string; dto: AddScheduleToLocationDto }
	>,
	"mutationFn" | "mutationKey"
>;

type BulkCreateScheduleMutationOptions = Omit<
	MutationOptions<
		LocationScheduleResponseDto[],
		ProblemDetailsError,
		{ locationId: string; items: AddScheduleToLocationDto[] }
	>,
	"mutationFn" | "mutationKey"
>;

type UpdateScheduleMutationOptions = Omit<
	MutationOptions<
		LocationScheduleResponseDto,
		ProblemDetailsError,
		{ locationId: string; scheduleId: string; dto: AddScheduleToLocationDto }
	>,
	"mutationFn" | "mutationKey"
>;

// ---------------------------------------------------------------------------

export const locationSchedulesQueryKeys = {
	all: () => ["location-schedules"] as const,
	admin: () => [...locationSchedulesQueryKeys.all(), "admin"] as const,
	portal: () => [...locationSchedulesQueryKeys.all(), "portal"] as const,
	list: (locationId: string) =>
		[...locationSchedulesQueryKeys.admin(), locationId] as const,
	rentalList: (locationId: string) =>
		[...locationSchedulesQueryKeys.portal(), "list", locationId] as const,
	slots: (params: GetLocationScheduleSlotsQueryDto & { locationId: string }) =>
		[
			...locationSchedulesQueryKeys.portal(),
			"slots",
			params.locationId,
			params.type,
			params.date,
		] as const,
};

// ---------------------------------------------------------------------------

export const locationScheduleQueries = {
	list: <TData = LocationScheduleResponseDto[]>(
		locationId: string,
		overrides?: LocationSchedulesQueryOverrides<TData>,
	) =>
		queryOptions<LocationScheduleResponseDto[], ProblemDetailsError, TData>({
			queryKey: locationSchedulesQueryKeys.list(locationId),
			queryFn: () => getLocationSchedules({ data: { locationId } }),
			...overrides,
		}),

	rentalList: <TData = LocationScheduleResponseDto[]>(
		locationId: string,
		overrides?: LocationSchedulesQueryOverrides<TData>,
	) =>
		queryOptions<LocationScheduleResponseDto[], ProblemDetailsError, TData>({
			queryKey: locationSchedulesQueryKeys.rentalList(locationId),
			queryFn: () => getRentalLocationSchedules({ data: { locationId } }),
			...overrides,
		}),

	slots: <TData = LocationScheduleSlotsResponse>(
		params: GetLocationScheduleSlotsQueryDto & { locationId: string },
		overrides?: LocationScheduleSlotsQueryOverrides<TData>,
	) =>
		queryOptions<LocationScheduleSlotsResponse, ProblemDetailsError, TData>({
			queryKey: locationSchedulesQueryKeys.slots(params),
			queryFn: () => getLocationScheduleSlots({ data: params }),
			...overrides,
		}),
};

// ---------------------------------------------------------------------------

export function useLocationSchedules<TData = LocationScheduleResponseDto[]>(
	locationId: string,
	overrides?: LocationSchedulesQueryOverrides<TData>,
) {
	return useQuery(locationScheduleQueries.list(locationId, overrides));
}

export function useRentalLocationSchedules<
	TData = LocationScheduleResponseDto[],
>(locationId: string, overrides?: LocationSchedulesQueryOverrides<TData>) {
	return useQuery(locationScheduleQueries.rentalList(locationId, overrides));
}

export function useLocationScheduleSlots<TData = LocationScheduleSlotsResponse>(
	params: GetLocationScheduleSlotsQueryDto & { locationId: string },
	overrides?: LocationScheduleSlotsQueryOverrides<TData>,
) {
	return useQuery(locationScheduleQueries.slots(params, overrides));
}

// ---------------------------------------------------------------------------

export function useCreateLocationSchedule(
	options?: CreateScheduleMutationOptions,
) {
	const queryClient = useQueryClient();

	return useMutation<
		LocationScheduleResponseDto,
		ProblemDetailsError,
		{ locationId: string; dto: AddScheduleToLocationDto }
	>({
		...options,
		mutationFn: ({ locationId, dto }) =>
			createLocationSchedule({ data: { locationId, dto } }),
		onSuccess: async (data, variables, context, onMutateResult) => {
			await queryClient.invalidateQueries({
				queryKey: locationSchedulesQueryKeys.all(),
			});

			await options?.onSuccess?.(data, variables, context, onMutateResult);
		},
		onError: async (error, variables, context, onMutateResult) => {
			await options?.onError?.(error, variables, context, onMutateResult);
		},
	});
}

export function useBulkCreateLocationSchedules(
	options?: BulkCreateScheduleMutationOptions,
) {
	const queryClient = useQueryClient();

	return useMutation<
		LocationScheduleResponseDto[],
		ProblemDetailsError,
		{ locationId: string; items: AddScheduleToLocationDto[] }
	>({
		...options,
		mutationFn: ({ locationId, items }) =>
			bulkCreateLocationSchedules({ data: { locationId, items } }),
		onSuccess: async (data, variables, context, onMutateResult) => {
			await queryClient.invalidateQueries({
				queryKey: locationSchedulesQueryKeys.all(),
			});

			await options?.onSuccess?.(data, variables, context, onMutateResult);
		},
		onError: async (error, variables, context, onMutateResult) => {
			await options?.onError?.(error, variables, context, onMutateResult);
		},
	});
}

// ---------------------------------------------------------------------------

export function useUpdateLocationSchedule(
	options?: UpdateScheduleMutationOptions,
) {
	const queryClient = useQueryClient();

	return useMutation<
		LocationScheduleResponseDto,
		ProblemDetailsError,
		{ locationId: string; scheduleId: string; dto: AddScheduleToLocationDto }
	>({
		...options,
		mutationFn: ({ locationId, scheduleId, dto }) =>
			updateLocationSchedule({ data: { locationId, scheduleId, dto } }),
		onSuccess: async (data, variables, context, onMutateResult) => {
			await queryClient.invalidateQueries({
				queryKey: locationSchedulesQueryKeys.all(),
			});

			await options?.onSuccess?.(data, variables, context, onMutateResult);
		},
		onError: async (error, variables, context, onMutateResult) => {
			await options?.onError?.(error, variables, context, onMutateResult);
		},
	});
}
