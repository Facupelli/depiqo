import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CombosPage } from "@/modules/products/list-combos/CombosPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const combosSearchSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().trim().min(1).optional(),
	status: z.enum(["ALL", "DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
	categoryId: z.string().trim().min(1).optional(),
	branchId: z.string().trim().min(1).optional(),
	branchScope: z.literal("all").optional(),
});

export const Route = createFileRoute("/_admin/dashboard/catalog/packages/")({
	validateSearch: combosSearchSchema,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar los combos."
			forbiddenMessage="No tienes permisos para ver los combos."
		/>
	),
	component: () => <CombosPage search={Route.useSearch()} />,
});
