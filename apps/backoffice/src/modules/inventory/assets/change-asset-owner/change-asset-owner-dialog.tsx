import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useId, useState } from "react";
import { useOwnerOptions } from "@/modules/inventory/ownership/public";
import { getChangeAssetOwnerErrorMessage } from "./change-asset-owner.errors";
import { useChangeAssetOwner } from "./change-asset-owner.mutation";
import {
	fromUnitToChangeAssetOwnerFormValues,
	toChangeAssetOwnerDto,
} from "./change-asset-owner.schema";
import {
	ChangeAssetOwnerForm,
	type ChangeAssetOwnerOwnerOption,
} from "./change-asset-owner-form";

interface ChangeAssetOwnerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipmentTypeId: string;
	unit: GetEquipmentTypeDetailResponseDto["assets"][number];
}

export function ChangeAssetOwnerDialog({
	open,
	onOpenChange,
	equipmentTypeId,
	unit,
}: ChangeAssetOwnerDialogProps) {
	const formId = useId();
	const {
		data: owners = [],
		isPending: isLoadingOwners,
		isError,
	} = useOwnerOptions();
	const { mutateAsync: changeOwner, isPending } = useChangeAssetOwner();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const ownerOptions: ChangeAssetOwnerOwnerOption[] = owners.map((owner) => ({
		id: owner.id,
		name: owner.name,
	}));

	if (
		unit.ownerId &&
		!ownerOptions.some((owner) => owner.id === unit.ownerId)
	) {
		ownerOptions.unshift({
			id: unit.ownerId,
			name: unit.ownerName ?? unit.ownerId,
		});
	}

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Cambiar propietario</DialogTitle>
					<DialogDescription>
						Actualiza el propietario de esta unidad física.
					</DialogDescription>
				</DialogHeader>

				{open ? (
					<ChangeAssetOwnerForm
						key={unit.id}
						formId={formId}
						defaultValues={fromUnitToChangeAssetOwnerFormValues(unit)}
						owners={ownerOptions}
						isLoadingOwners={isLoadingOwners}
						ownerOptionsError={
							isError
								? "No se pudieron cargar todos los propietarios. Intentá de nuevo."
								: null
						}
						isPending={isPending}
						errorMessage={errorMessage}
						onOwnerChange={() => setErrorMessage(null)}
						onCancel={() => onOpenChange(false)}
						onSubmit={async (values) => {
							setErrorMessage(null);
							try {
								await changeOwner({
									equipmentTypeId,
									assetId: unit.id,
									body: toChangeAssetOwnerDto(values),
								});
								onOpenChange(false);
							} catch (error) {
								setErrorMessage(getChangeAssetOwnerErrorMessage(error));
							}
						}}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
