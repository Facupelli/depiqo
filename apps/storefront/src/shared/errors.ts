import type { ProblemDetails } from "@repo/schemas";

export class ProblemDetailsError extends Error {
	public readonly problemDetails: ProblemDetails;

	constructor(problemDetails: ProblemDetails) {
		super(problemDetails.title);
		this.name = "ProblemDetailsError";
		this.problemDetails = problemDetails;
	}
}

export class AuthRequiredError extends Error {
	public readonly status = 401;

	constructor(message = "Authentication is required") {
		super(message);
		this.name = "AuthRequiredError";
	}
}

export class SessionExpiredError extends Error {
	public readonly status = 401;

	constructor(message = "Your session has expired") {
		super(message);
		this.name = "SessionExpiredError";
	}
}

export class WrongActorError extends Error {
	public readonly status = 403;

	constructor(message = "Authenticated session does not match this resource") {
		super(message);
		this.name = "WrongActorError";
	}
}

export function isAuthRequiredError(
	error: unknown,
): error is AuthRequiredError {
	return error instanceof AuthRequiredError;
}

export function isSessionExpiredError(
	error: unknown,
): error is SessionExpiredError {
	return error instanceof SessionExpiredError;
}

export function isWrongActorError(error: unknown): error is WrongActorError {
	return error instanceof WrongActorError;
}

type ProblemDetailsLike = {
	problemDetails?: Partial<ProblemDetails>;
	status?: number;
	message?: string;
	name?: string;
};

const EXCEPTION_STATUS_MAP: Record<string, number> = {
	AuthRequiredError: 401,
	ForbiddenException: 403,
	SessionExpiredError: 401,
	UnauthorizedException: 401,
	WrongActorError: 403,
};

export function getProblemDetailsStatus(error: unknown): number | undefined {
	if (error instanceof ProblemDetailsError) {
		return error.problemDetails.status;
	}

	if (!error || typeof error !== "object") {
		return undefined;
	}

	const candidate = error as ProblemDetailsLike;

	if (typeof candidate.problemDetails?.status === "number") {
		return candidate.problemDetails.status;
	}

	if (typeof candidate.status === "number") {
		return candidate.status;
	}

	const exceptionKey =
		typeof candidate.name === "string" && candidate.name in EXCEPTION_STATUS_MAP
			? candidate.name
			: typeof candidate.message === "string" &&
					candidate.message in EXCEPTION_STATUS_MAP
				? candidate.message
				: undefined;

	if (exceptionKey) {
		return EXCEPTION_STATUS_MAP[exceptionKey];
	}

	return undefined;
}

export function isAuthError(error: unknown): boolean {
	return (
		isAuthRequiredError(error) ||
		isSessionExpiredError(error) ||
		getProblemDetailsStatus(error) === 401
	);
}

export function isForbiddenError(error: unknown): boolean {
	return getProblemDetailsStatus(error) === 403;
}
