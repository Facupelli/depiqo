import type { MeResponse } from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { authenticatedApiFetch as apiFetch } from "@/lib/api-auth";

export const getCurrentUser = createServerFn({ method: "GET" }).handler(
	async (): Promise<MeResponse> => {
		const result = await apiFetch<MeResponse>("/users/me", {
			method: "GET",
		});

		return result;
	},
);
