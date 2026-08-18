import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/public";
import { useBranches } from "@/modules/settings/branches/public";
import { useCategories } from "@/modules/settings/categories/public";
import { CreatePackageForm } from "./CreatePackageForm";
import { useCreatePackage } from "./create-package.mutation";
import { toCreatePackageDto } from "./create-package.schema";

const formId = "create-package";
const equipmentTypeSearchLimit = 15;

export function CreatePackagePage() {
	const navigate = useNavigate();
	const [equipmentSearch, setEquipmentSearch] = useState("");
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches();
	const { data: equipmentTypes = [] } = useEquipmentTypeOptions({
		search: equipmentSearch.trim() || undefined,
		limit: equipmentTypeSearchLimit,
	});
	const { mutateAsync: createPackage, isPending } = useCreatePackage();

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">Productos</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Crear paquete
				</h1>
				<p className="mt-3 text-muted-foreground">
					Define los equipos requeridos, sucursales e imagen con los que este
					paquete se mostrará en el catálogo.
				</p>
			</header>

			<CreatePackageForm
				formId={formId}
				categories={categories.filter((category) => category.isActive)}
				branches={branches}
				equipmentTypes={equipmentTypes}
				equipmentSearch={equipmentSearch}
				onEquipmentSearchChange={setEquipmentSearch}
				isPending={isPending}
				submitLabel="Crear paquete"
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
