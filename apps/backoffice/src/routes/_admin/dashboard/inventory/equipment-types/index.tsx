import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { EquipmentTypesPage } from "@/modules/inventory/equipment-types/list-equipment-types/EquipmentTypesPage";
import { equipmentTypeSummaryQueries } from "@/modules/inventory/equipment-types/list-equipment-types/equipment-type-summaries.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

const equipmentTypesSearchSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	pageSize: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().trim().min(1).optional(),
	branchId: z.string().trim().min(1).optional(),
});

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/",
)({
	validateSearch: equipmentTypesSearchSchema,
	loaderDeps: ({ search }) => ({
		page: search.page,
		pageSize: search.pageSize,
		search: search.search,
		branchId: search.branchId,
	}),
	loader: async ({ context: { queryClient }, deps }) => {
		const query = {
			page: deps.page,
			pageSize: deps.pageSize,
			...(deps.search ? { search: deps.search } : {}),
			...(deps.branchId ? { branchId: deps.branchId } : {}),
		};
		const data = await queryClient.fetchQuery({
			...equipmentTypeSummaryQueries.list(query),
			staleTime: 0,
		});
		const totalPages = Math.ceil(data.total / deps.pageSize);
		if (deps.page > totalPages && deps.page > 1) {
			throw redirect({
				to: "/dashboard/inventory/equipment-types",
				search: (prev) => ({ ...prev, page: Math.max(1, totalPages) }),
				replace: true,
			});
		}
	},
	errorComponent: ({ error }) => (
		<AdminRouteError
			error={error}
			genericMessage="No pudimos cargar el inventario de equipos."
			forbiddenMessage="No tienes permisos para ver el inventario de equipos."
		/>
	),
	component: EquipmentTypesRoute,
});

function EquipmentTypesRoute() {
	const navigate = useNavigate({ from: Route.fullPath });
	const search = Route.useSearch();

	return (
		<EquipmentTypesPage
			search={search}
			onSearchChange={(updater) => {
				navigate({ search: updater, replace: true });
			}}
			onEquipmentTypeClick={(equipmentType) => {
				navigate({
					to: "/dashboard/inventory/equipment-types/$equipmentTypeId",
					params: { equipmentTypeId: equipmentType.id },
				});
			}}
		/>
	);
}
