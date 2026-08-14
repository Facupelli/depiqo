import type { ProblemDetails } from "@repo/schemas";

export class StorefrontTransportError extends Error {
	constructor(public readonly problemDetails: ProblemDetails) {
		super(problemDetails.title);
		this.name = "StorefrontTransportError";
	}
}
