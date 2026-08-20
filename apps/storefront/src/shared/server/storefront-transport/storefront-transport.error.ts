import type { ProblemDetails } from "@repo/api-contracts";

export class StorefrontTransportError extends Error {
	constructor(public readonly problemDetails: ProblemDetails) {
		super(problemDetails.title);
		this.name = "StorefrontTransportError";
	}
}
