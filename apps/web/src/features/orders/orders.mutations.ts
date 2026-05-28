import type {
	CreateDraftOrderDto,
	CreateOrderResponseDto,
	DraftOrderPricingProposalRequestDto,
	DraftOrderPricingProposalResponseDto,
	GetDraftOrderPricingParamDto,
	GetOrderByIdParamDto,
	ProblemDetails,
	RejectOrderRequestDto,
	UpdateDraftOrderPricingRequestDto,
} from "@repo/schemas";
import { type UseMutationOptions, useMutation } from "@tanstack/react-query";
import { ProblemDetailsError } from "@/shared/errors";
import {
	type CreateOrderMutationVariables,
	cancelOrder,
	confirmOrder,
	createDraftOrder,
	createOrder,
	editOrder,
	getDraftOrderPricingProposal,
	markEquipmentAsRetired,
	markEquipmentAsReturned,
	rejectOrder,
	updateDraftOrder,
	updateDraftOrderPricing,
} from "./orders.api";
import { orderKeys } from "./orders.keys";

type OrderDetailMutationOptions = Omit<
	UseMutationOptions<void, ProblemDetailsError, GetOrderByIdParamDto>,
	"mutationFn"
>;

type RejectOrderVariables = {
	orderId: string;
	dto: RejectOrderRequestDto;
};

type RejectOrderMutationOptions = Omit<
	UseMutationOptions<void, ProblemDetailsError, RejectOrderVariables>,
	"mutationFn"
>;

type OrderMutationOptions = Omit<
	UseMutationOptions<
		CreateOrderResponseDto,
		ProblemDetailsError,
		CreateOrderMutationVariables
	>,
	"mutationFn"
>;

type DraftOrderMutationOptions = Omit<
	UseMutationOptions<string, ProblemDetailsError, CreateDraftOrderDto>,
	"mutationFn"
>;

type OrderCompositionVariables = {
	orderId: string;
	data: CreateDraftOrderDto;
};

type OrderCompositionMutationOptions = Omit<
	UseMutationOptions<void, ProblemDetailsError, OrderCompositionVariables>,
	"mutationFn"
>;

type DraftOrderPricingVariables = {
	params: GetDraftOrderPricingParamDto;
	dto: DraftOrderPricingProposalRequestDto;
};

type DraftOrderPricingProposalMutationOptions = Omit<
	UseMutationOptions<
		DraftOrderPricingProposalResponseDto,
		ProblemDetailsError,
		DraftOrderPricingVariables
	>,
	"mutationFn"
>;

type UpdateDraftOrderPricingVariables = {
	params: GetDraftOrderPricingParamDto;
	dto: UpdateDraftOrderPricingRequestDto;
};

type UpdateDraftOrderPricingMutationOptions = Omit<
	UseMutationOptions<
		void,
		ProblemDetailsError,
		UpdateDraftOrderPricingVariables
	>,
	"mutationFn"
>;

export function useCreateOrder(options?: OrderMutationOptions) {
	return useMutation<
		CreateOrderResponseDto,
		ProblemDetailsError,
		CreateOrderMutationVariables
	>({
		...options,
		mutationFn: async (variables) => {
			const result = await createOrder({ data: variables });
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
	return useMutation<void, ProblemDetailsError, OrderCompositionVariables>({
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
	return useMutation<void, ProblemDetailsError, OrderCompositionVariables>({
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
		DraftOrderPricingVariables
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
			invalidates: (variables: DraftOrderPricingVariables) =>
				orderKeys.draftPricingProposal(variables.params, variables.dto),
		},
	});
}

export function useUpdateDraftOrderPricing(
	options?: UpdateDraftOrderPricingMutationOptions,
) {
	return useMutation<
		void,
		ProblemDetailsError,
		UpdateDraftOrderPricingVariables
	>({
		...options,
		mutationFn: async (data) => {
			const result = await updateDraftOrderPricing({ data });
			if (hasMutationError(result)) {
				throw new ProblemDetailsError(result.error);
			}
		},
		meta: {
			invalidates: (variables: UpdateDraftOrderPricingVariables) => [
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

export function useRejectOrder(options?: RejectOrderMutationOptions) {
	return useMutation<void, ProblemDetailsError, RejectOrderVariables>({
		...options,
		mutationFn: async ({ orderId, dto }) => {
			const result = await rejectOrder({ data: { params: { orderId }, dto } });
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
