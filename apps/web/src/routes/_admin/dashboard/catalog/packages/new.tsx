import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { useCreatePackage } from "@/v2/features/admin/offering-setup/create-package/create-package.mutation";
import { toCreatePackageDto } from "@/v2/features/admin/offering-setup/create-package/create-package.schema";
import { CreatePackageForm } from "@/v2/features/admin/offering-setup/create-package/create-package-form";
import { useEquipmentTypes } from "@/v2/features/asset-inventory/equipment-types/equipment-types.queries";
import { useCategories } from "@/v2/features/catalog/categories/categories.queries";
import { useBranches } from "@/v2/features/tenant-management/branch/branch.queries";

export const Route = createFileRoute("/_admin/dashboard/catalog/packages/new")({
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el formulario para crear el combo."
				forbiddenMessage="No tienes permisos para crear combos."
			/>
		);
	},
	component: CreatePackagePage,
});

const formId = "create-package";
const EQUIPMENT_TYPE_SEARCH_LIMIT = 15;

function CreatePackagePage() {
	const navigate = useNavigate();
	const [equipmentSearch, setEquipmentSearch] = useState("");
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches();
	const { data: equipmentTypes = [] } = useEquipmentTypes({
		isActive: true,
		search: equipmentSearch.trim() || undefined,
		limit: EQUIPMENT_TYPE_SEARCH_LIMIT,
	});
	const { mutateAsync: createPackage, isPending } = useCreatePackage();

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">
					Catálogo de alquiler
				</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Crear combo
				</h1>
				<p className="mt-3 text-muted-foreground">
					Define los equipos, sucursales e imagen con los que este combo se
					mostrará en el catálogo.
				</p>
			</header>

			<CreatePackageForm
				formId={formId}
				categories={categories}
				branches={branches}
				equipmentTypes={equipmentTypes}
				equipmentSearch={equipmentSearch}
				onEquipmentSearchChange={setEquipmentSearch}
				isPending={isPending}
				submitLabel="Crear combo"
				pendingLabel="Creando..."
				cancelLabel="Cancelar"
				onCancel={() => navigate({ to: "/dashboard/catalog" })}
				onSubmit={async (values) => {
					await createPackage(toCreatePackageDto(values));
					navigate({ to: "/dashboard/catalog" });
				}}
			/>
		</div>
	);
}
