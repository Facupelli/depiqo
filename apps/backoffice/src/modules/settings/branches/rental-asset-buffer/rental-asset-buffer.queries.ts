import type { BranchRentalAssetBufferDto } from "@repo/api-contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { branchKeys } from "../branches.queries";
import {
	getRentalAssetBuffer,
	putRentalAssetBuffer,
} from "./rental-asset-buffer.api";

const rentalAssetBufferKey = (branchId: string) =>
	[...branchKeys.all(), "rental-asset-buffer", branchId] as const;

export function useRentalAssetBuffer(branchId: string) {
	return useQuery({
		queryKey: rentalAssetBufferKey(branchId),
		queryFn: () => getRentalAssetBuffer(branchId),
	});
}

export function usePutRentalAssetBuffer(branchId: string) {
	return useMutation({
		mutationFn: (buffer: BranchRentalAssetBufferDto) =>
			putRentalAssetBuffer({ branchId, buffer }),
		meta: { invalidates: rentalAssetBufferKey(branchId) },
	});
}
