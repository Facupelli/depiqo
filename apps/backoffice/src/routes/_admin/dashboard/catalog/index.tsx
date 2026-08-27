import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ProductsPage } from "@/modules/products/list-products/ProductsPage";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const BooleanSearchParamSchema = z.preprocess((value) => {
	if (value === undefined || value === null || value === "") return undefined;
	if (value === true || value === "true") return true;
	if (value === false || value === "false") return false;
	return value;
}, z.boolean().optional());

const catalogSearchSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().trim().min(1).optional(),
	kind: z.enum(["SINGLE", "PACKAGE"]).optional(),
	status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("ACTIVE"),
	categoryId: z.string().trim().min(1).optional(),
	branchId: z.string().trim().min(1).optional(),
	isVisible: BooleanSearchParamSchema,
	isRentable: BooleanSearchParamSchema,
	hasActivePricing: BooleanSearchParamSchema,
});

export const Route = createFileRoute("/_admin/dashboard/catalog/")({
	validateSearch: catalogSearchSchema,
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar los productos."
			forbiddenMessage="No tienes permisos para ver los productos."
		/>
	),
	component: () => <ProductsPage search={Route.useSearch()} />,
});
