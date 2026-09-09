import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { equipmentTypeSummaryQueries } from "@/modules/inventory/equipment-types/public";
import { useBranches } from "@/modules/settings/branches/public";
import { useCategories } from "@/modules/settings/categories/public";
import { CreateComboForm } from "./CreateComboForm";
import {
	type CreateComboSubmissionError,
	mapCreateComboError,
} from "./create-combo.errors";
import { useCreateCombo } from "./create-combo.mutation";
import {
	createComboFormDefaultValues,
	toCreateComboDto,
} from "./create-combo.schema";

const formId = "create-combo";
export function CreateComboPage({
	equipmentTypeId,
}: {
	equipmentTypeId?: string;
}) {
	const navigate = useNavigate();
	const { data: categories = [] } = useCategories();
	const { data: branches = [] } = useBranches({ isActive: true });
	const preselectedEquipmentQuery = useQuery({
		...equipmentTypeSummaryQueries.summary(equipmentTypeId ?? ""),
		enabled: Boolean(equipmentTypeId),
	});
	const preselectedEquipment = preselectedEquipmentQuery.data;
	const { mutateAsync: createCombo, isPending } = useCreateCombo();
	const [submitError, setSubmitError] =
		useState<CreateComboSubmissionError | null>(null);

	if (equipmentTypeId && preselectedEquipmentQuery.isPending) {
		return (
			<div className="px-6 py-12 text-muted-foreground">Cargando equipo...</div>
		);
	}
	if (
		equipmentTypeId &&
		(!preselectedEquipment || preselectedEquipmentQuery.isError)
	) {
		return (
			<div className="px-6 py-12 text-destructive">
				No pudimos resolver el equipo seleccionado.
			</div>
		);
	}
	const defaultValues = createComboFormDefaultValues();
	if (preselectedEquipment) {
		defaultValues.requirements = [
			{
				equipmentTypeId: preselectedEquipment.id,
				equipmentTypeName: preselectedEquipment.name,
				quantityPerItem: 1,
			},
		];
	}

	return (
		<div className="mx-auto w-full max-w-6xl px-6 py-10">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-muted-foreground text-sm">Combos</p>
				<h1 className="mt-2 font-semibold text-3xl tracking-tight">
					Nuevo combo
				</h1>
				<p className="mt-3 text-muted-foreground">
					Define la presentación, los equipos incluidos y las sucursales donde
					estará disponible.
				</p>
			</header>

			<CreateComboForm
				key={equipmentTypeId ?? "default"}
				formId={formId}
				defaultValues={defaultValues}
				categories={categories.filter((category) => category.isActive)}
				branches={branches}
				isPending={isPending}
				submitError={submitError}
				submitLabel="Crear combo"
				pendingLabel="Creando..."
				cancelLabel="Cancelar"
				onCancel={() => navigate({ to: "/dashboard/catalog/packages" })}
				onSubmit={async (values) => {
					setSubmitError(null);
					try {
						const result = await createCombo(toCreateComboDto(values));
						navigate({
							to: "/dashboard/catalog/packages/$rentableItemId",
							params: { rentableItemId: result.rentableItemId },
						});
					} catch (error) {
						setSubmitError(mapCreateComboError(error));
					}
				}}
			/>
		</div>
	);
}
