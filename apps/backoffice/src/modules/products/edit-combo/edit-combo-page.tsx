import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useCategories } from "@/modules/settings/categories/public";
import {
	type EditComboSubmissionError,
	mapEditComboError,
} from "./edit-combo.errors";
import { useUpdateCombo } from "./edit-combo.mutation";
import {
	fromComboDetailToFormValues,
	toUpdateComboDto,
} from "./edit-combo.schema";
import { EditComboForm } from "./edit-combo-form";

export function EditComboPage({
	combo,
}: {
	combo: GetRentableItemDetailResponseDto;
}) {
	const navigate = useNavigate();
	const categories = useCategories();
	const mutation = useUpdateCombo();
	const [submitError, setSubmitError] =
		useState<EditComboSubmissionError | null>(null);
	const destination = {
		to: "/dashboard/catalog/packages/$rentableItemId" as const,
		params: { rentableItemId: combo.id },
	};

	return (
		<div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
			<header className="mb-10 max-w-3xl">
				<p className="font-medium text-sm text-muted-foreground">Combos</p>
				<h1 className="mt-2 text-3xl font-semibold tracking-tight">
					Editar combo
				</h1>
				<p className="mt-3 text-muted-foreground">
					Actualiza la presentación y los equipos incluidos en {combo.name}.
				</p>
			</header>
			<EditComboForm
				key={combo.id}
				formId={`edit-combo-${combo.id}`}
				defaultValues={fromComboDetailToFormValues(combo)}
				categories={(categories.data ?? []).filter((item) => item.isActive)}
				isCategoriesLoading={categories.isPending}
				isPending={mutation.isPending}
				submitError={submitError}
				onCancel={() => navigate(destination)}
				onSubmit={async (values) => {
					setSubmitError(null);
					try {
						await mutation.mutateAsync({
							rentableItemId: combo.id,
							body: toUpdateComboDto(values),
							originalEquipmentTypeIds: combo.requiredEquipment.map(
								(item) => item.equipmentTypeId,
							),
						});
						await navigate(destination);
					} catch (error) {
						setSubmitError(mapEditComboError(error));
					}
				}}
			/>
		</div>
	);
}
