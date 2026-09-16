import { queryOptions, useQuery } from "@tanstack/react-query";
import { getTeamMembers, getTeamRoles } from "./team.api";

export const teamKeys = {
	all: () => ["settings", "team"] as const,
	list: () => [...teamKeys.all(), "list"] as const,
	roles: () => [...teamKeys.all(), "roles"] as const,
};

export const teamQueries = {
	list: () =>
		queryOptions({
			queryKey: teamKeys.list(),
			queryFn: getTeamMembers,
		}),
	roles: () =>
		queryOptions({
			queryKey: teamKeys.roles(),
			queryFn: getTeamRoles,
		}),
};

export function useTeamMembers() {
	return useQuery(teamQueries.list());
}

export function useTeamRoles(enabled: boolean) {
	return useQuery({
		...teamQueries.roles(),
		enabled,
	});
}
