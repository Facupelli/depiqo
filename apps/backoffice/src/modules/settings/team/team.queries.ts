import { queryOptions, useQuery } from "@tanstack/react-query";
import {
	getTeamMembers,
	getTeamPermissionCatalog,
	getTeamRoles,
} from "./team.api";

export const teamKeys = {
	all: () => ["settings", "team"] as const,
	list: () => [...teamKeys.all(), "list"] as const,
	roles: () => [...teamKeys.all(), "roles"] as const,
	permissionCatalog: () => [...teamKeys.all(), "permission-catalog"] as const,
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
	permissionCatalog: () =>
		queryOptions({
			queryKey: teamKeys.permissionCatalog(),
			queryFn: getTeamPermissionCatalog,
		}),
};

export function useTeamMembers() {
	return useQuery(teamQueries.list());
}

export function useTeamRoles(enabled = true) {
	return useQuery({
		...teamQueries.roles(),
		enabled,
	});
}

export function useTeamPermissionCatalog() {
	return useQuery(teamQueries.permissionCatalog());
}
