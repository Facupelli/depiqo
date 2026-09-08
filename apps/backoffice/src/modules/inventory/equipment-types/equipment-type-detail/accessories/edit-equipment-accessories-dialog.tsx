import type { GetEquipmentTypeAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useId } from "react";
import {
	fromAccessoryDefaultsToFormValues,
	toReplaceEquipmentAccessoriesDto,
} from "./edit-equipment-accessories.schema";
import { EditEquipmentAccessoriesForm } from "./edit-equipment-accessories-form";
import { useReplaceEquipmentAccessories } from "./replace-equipment-accessories.mutation";

type Props = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipmentTypeId: string;
	accessoryDefaults: GetEquipmentTypeAccessoryDefaultsResponseDto;
};

export function EditEquipmentAccessoriesDialog({
	open,
	onOpenChange,
	equipmentTypeId,
	accessoryDefaults,
}: Props) {
	const formId = useId();
	const { mutateAsync: replaceAccessories, isPending } =
		useReplaceEquipmentAccessories();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-3xl">
				<DialogHeader>
					<DialogTitle>Editar accesorios</DialogTitle>
					<DialogDescription>
						Configura el conjunto de accesorios y sus cantidades sugeridas.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<EditEquipmentAccessoriesForm
						key={equipmentTypeId}
						formId={formId}
						equipmentTypeId={equipmentTypeId}
						defaultValues={fromAccessoryDefaultsToFormValues(accessoryDefaults)}
						isPending={isPending}
						onCancel={() => onOpenChange(false)}
						onSubmit={async (values) => {
							await replaceAccessories({
								equipmentTypeId,
								body: toReplaceEquipmentAccessoriesDto(values),
							});
							onOpenChange(false);
						}}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
