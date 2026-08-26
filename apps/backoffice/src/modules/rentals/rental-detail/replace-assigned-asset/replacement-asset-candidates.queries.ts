import type {
	GetReplacementAssetCandidatesParamsDto,
	GetReplacementAssetCandidatesResponseDto,
} from "@repo/api-contracts";
import { queryOptions } from "@tanstack/react-query";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import type { ProblemDetailsError } from "@/shared/errors";
import { getReplacementAssetCandidates } from "./get-replacement-asset-candidates.api";

interface ReplacementAssetCandidateQueryInput
	extends GetReplacementAssetCandidatesParamsDto {
	rentalVersion: number;
}

export const replacementAssetCandidateKeys = {
	all: (rentalId: string) =>
		[...rentalKeys.detail(rentalId), "replacement-asset-candidates"] as const,
	forAssignment: (input: ReplacementAssetCandidateQueryInput) =>
		[
			...replacementAssetCandidateKeys.all(input.rentalId),
			input.currentAssignedAssetId,
			input.rentalVersion,
		] as const,
};

export const replacementAssetCandidateQueries = {
	forAssignment: (
		input: ReplacementAssetCandidateQueryInput,
		enabled: boolean,
	) =>
		queryOptions<GetReplacementAssetCandidatesResponseDto, ProblemDetailsError>(
			{
				queryKey: replacementAssetCandidateKeys.forAssignment(input),
				queryFn: () =>
					getReplacementAssetCandidates({
						rentalId: input.rentalId,
						currentAssignedAssetId: input.currentAssignedAssetId,
					}),
				enabled:
					enabled &&
					input.rentalId.length > 0 &&
					input.currentAssignedAssetId.length > 0,
			},
		),
};
