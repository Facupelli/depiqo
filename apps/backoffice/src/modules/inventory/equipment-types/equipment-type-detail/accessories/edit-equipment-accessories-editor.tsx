import type { GetEquipmentTypeAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import { useId } from "react";
import {
	fromAccessoryDefaultsToFormValues,
	toReplaceEquipmentAccessoriesDto,
} from "./edit-equipment-accessories.schema";
import { EditEquipmentAccessoriesForm } from "./edit-equipment-accessories-form";
import { useReplaceEquipmentAccessories } from "./replace-equipment-accessories.mutation";

type Props = {
	equipmentTypeId: string;
	accessoryDefaults: GetEquipmentTypeAccessoryDefaultsResponseDto;
	onCancel: () => void;
	onSaved: () => void;
};

export function EditEquipmentAccessoriesEditor({
	equipmentTypeId,
	accessoryDefaults,
	onCancel,
	onSaved,
}: Props) {
	const formId = useId();
	const { mutateAsync: replaceAccessories, isPending } =
		useReplaceEquipmentAccessories();

	return (
		<EditEquipmentAccessoriesForm
			formId={formId}
			equipmentTypeId={equipmentTypeId}
			defaultValues={fromAccessoryDefaultsToFormValues(accessoryDefaults)}
			isPending={isPending}
			onCancel={onCancel}
			onSubmit={async (values) => {
				await replaceAccessories({
					equipmentTypeId,
					body: toReplaceEquipmentAccessoriesDto(values),
				});
				onSaved();
			}}
		/>
	);
}
