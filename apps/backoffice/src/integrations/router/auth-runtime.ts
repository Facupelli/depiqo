type InvalidatableRouter = {
	invalidate: () => Promise<void>;
};

let router: InvalidatableRouter | null = null;
let pendingInvalidation: Promise<void> | null = null;

export function registerAuthRouter(nextRouter: InvalidatableRouter) {
	router = nextRouter;
}

export function invalidateRouterForAuthFailure() {
	if (typeof window === "undefined" || !router) {
		return;
	}

	if (pendingInvalidation) {
		return;
	}

	pendingInvalidation = Promise.resolve(router.invalidate())
		.catch(() => {
			// Route-level auth guards decide the final redirect.
		})
		.finally(() => {
			pendingInvalidation = null;
		});
}
