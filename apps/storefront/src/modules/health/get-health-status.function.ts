import { createServerFn } from "@tanstack/react-start";
import { validateServerEnvironment } from "@/config/server-env";

export const getHealthStatus = createServerFn({ method: "GET" }).handler(() => {
	validateServerEnvironment();

	return { status: "ok" as const };
});
