import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/public";
import { useBranches } from "@/modules/settings/branches/public";
import { useCategories } from "@/modules/settings/categories/public";
import useDebounce from "@/shared/hooks/use-debounce";
import { CreatePackageForm } from "./CreatePackageForm";
import {
	type CreatePackageSubmissionError,
	mapCreatePackageError,
} from "./create-package.errors";
import { useCreatePackage } from "./create-package.mutation";
import { toCreatePackageDto } from "./create-package.schema";

const formId = "create-package";
const equipmentTypeSearchLimit = 15;

export function CreatePackagePage() {
	const navigate = useNavigate();
	const [equipmentSearchInput, setEquipmentSearchInput] = useState("");
	const [hasSelectedBranches, setHasSelectedBranches] = useState(false);
	const debouncedEquipmentSearch = useDebounce(equipmentSearchInput, 300);
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches();
	const {
		data: equipmentTypes = [],
		isFetching: isEquipmentSearchFetching,
		isError: isEquipmentSearchError,
	} = useEquipmentTypeOptions(
		{
			search: debouncedEquipmentSearch.trim() || undefined,
			limit: equipmentTypeSearchLimit,
		},
		{ enabled: hasSelectedBranches },
	);
	const isEquipmentSearchDebouncing =
		equipmentSearchInput.trim() !== debouncedEquipmentSearch.trim();
	const { mutateAsync: createPackage, isPending } = useCreatePackage();
	const [submitError, setSubmitError] =
		useState<CreatePackageSubmissionError | null>(null);

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
				equipmentSearch={equipmentSearchInput}
				isEquipmentSearchFetching={
					isEquipmentSearchDebouncing || isEquipmentSearchFetching
				}
				isEquipmentSearchError={isEquipmentSearchError}
				onEquipmentSearchChange={setEquipmentSearchInput}
				onSelectedBranchIdsChange={(branchIds) =>
					setHasSelectedBranches(branchIds.length > 0)
				}
				isPending={isPending}
				submitError={submitError}
				submitLabel="Crear paquete"
				pendingLabel="Creando..."
				cancelLabel="Cancelar"
				onCancel={() => navigate({ to: "/dashboard/catalog" })}
				onSubmit={async (values) => {
					setSubmitError(null);
					try {
						await createPackage(toCreatePackageDto(values));
						navigate({ to: "/dashboard/catalog" });
					} catch (error) {
						setSubmitError(mapCreatePackageError(error));
					}
				}}
			/>
		</div>
	);
}
