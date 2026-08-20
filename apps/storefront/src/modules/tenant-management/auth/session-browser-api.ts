import { problemDetailsSchema } from "@repo/api-contracts";
import { z } from "zod";
import { ProblemDetailsError } from "@/shared/errors";

const envelopeSchema = z.object({ data: z.unknown() });
const SESSION_BFF_PREFIX = "/session";

export async function sessionBrowserApiFetch(
	path: string,
	init?: RequestInit,
): Promise<unknown | null> {
	const response = await fetch(`${SESSION_BFF_PREFIX}${path}`, {
		...init,
		credentials: "include",
	});

	if (!response.ok) {
		const parsed = problemDetailsSchema.safeParse(
			await response.json().catch(() => null),
		);
		if (parsed.success) throw new ProblemDetailsError(parsed.data);
		throw new Error(`Session request failed with status ${response.status}`);
	}

	if (response.status === 204) return null;
	return envelopeSchema.parse(await response.json()).data;
}
