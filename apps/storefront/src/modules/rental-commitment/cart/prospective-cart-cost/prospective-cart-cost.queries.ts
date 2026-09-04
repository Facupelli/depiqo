import type {
	ProspectiveCartCostBodyDto,
	ProspectiveCartCostResponseDto,
} from "@repo/api-contracts";
import {
	queryOptions,
	type UseQueryOptions,
	useQuery,
} from "@tanstack/react-query";
import type { ProblemDetailsError } from "@/shared/errors";
import { calculateProspectiveCartCostFn } from "./prospective-cart-cost.functions";

type Overrides = Omit<
	UseQueryOptions<ProspectiveCartCostResponseDto, ProblemDetailsError>,
	"queryKey" | "queryFn"
>;

export const prospectiveCartCostKeys = {
	all: () => ["rental-commitment", "cart", "prospective-cost"] as const,
	calculation: (body: ProspectiveCartCostBodyDto | null) =>
		[...prospectiveCartCostKeys.all(), body] as const,
};

export const prospectiveCartCostQueries = {
	calculate: (body: ProspectiveCartCostBodyDto | null, overrides?: Overrides) =>
		queryOptions<ProspectiveCartCostResponseDto, ProblemDetailsError>({
			...overrides,
			queryKey: prospectiveCartCostKeys.calculation(body),
			queryFn: () => {
				if (!body) throw new Error("Prospective cart cost input is required");
				return calculateProspectiveCartCostFn({ data: body });
			},
			enabled: !!body && (overrides?.enabled ?? true),
		}),
};

export function useProspectiveCartCost(
	body: ProspectiveCartCostBodyDto | null,
) {
	return useQuery(prospectiveCartCostQueries.calculate(body));
}
