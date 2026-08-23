import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useId } from "react";
import { useUpdateAsset } from "./edit-asset.mutation";
import { fromUnitToEditFormValues, toUpdateDto } from "./edit-asset.schema";
import { EditAssetForm } from "./edit-asset-form";

interface EditAssetDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipmentTypeId: string;
	unit: GetEquipmentTypeDetailResponseDto["assets"][number];
}

export function EditAssetDialog({
	open,
	onOpenChange,
	equipmentTypeId,
	unit,
}: EditAssetDialogProps) {
	const formId = useId();
	const { mutateAsync: updateAsset, isPending } = useUpdateAsset();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Editar unidad</DialogTitle>
					<DialogDescription>
						Actualiza el número de serie o las notas de esta unidad física.
					</DialogDescription>
				</DialogHeader>

				{open && (
					<EditAssetForm
						key={open ? "open" : "closed"}
						formId={formId}
						defaultValues={fromUnitToEditFormValues(unit)}
						isPending={isPending}
						onCancel={() => onOpenChange(false)}
						onSubmit={async (values) => {
							await updateAsset({
								equipmentTypeId,
								assetId: unit.id,
								body: toUpdateDto(values),
							});
							onOpenChange(false);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
