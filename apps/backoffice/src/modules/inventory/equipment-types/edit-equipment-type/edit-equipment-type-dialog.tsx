import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useId } from "react";
import { useCategories } from "@/modules/settings/categories/public";
import { useUpdateEquipmentType } from "./edit-equipment-type.mutation";
import {
	fromEquipmentTypeDetailToEditFormValues,
	toUpdateEquipmentTypeDto,
} from "./edit-equipment-type.schema";
import { EditEquipmentTypeForm } from "./edit-equipment-type-form";

interface EditEquipmentTypeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipmentType: GetEquipmentTypeDetailResponseDto;
}

export function EditEquipmentTypeDialog({
	open,
	onOpenChange,
	equipmentType,
}: EditEquipmentTypeDialogProps) {
	const formId = useId();
	const { data: categories = [] } = useCategories();
	const { mutateAsync: updateEquipmentType, isPending } =
		useUpdateEquipmentType();

	const selectableCategories = categories.filter(
		(category) => category.isActive || category.id === equipmentType.categoryId,
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Editar equipo</DialogTitle>
					<DialogDescription>
						Actualiza la información de {equipmentType.name}.
					</DialogDescription>
				</DialogHeader>

				{open && (
					<EditEquipmentTypeForm
						key={open ? "open" : "closed"}
						formId={formId}
						defaultValues={fromEquipmentTypeDetailToEditFormValues(
							equipmentType,
						)}
						categories={selectableCategories}
						isPending={isPending}
						onCancel={() => onOpenChange(false)}
						onSubmit={async (values) => {
							await updateEquipmentType({
								equipmentTypeId: equipmentType.id,
								body: toUpdateEquipmentTypeDto(values),
							});
							onOpenChange(false);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
