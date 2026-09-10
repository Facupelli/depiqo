import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { useId } from "react";
import { useOwnerOptions } from "@/modules/inventory/ownership/owner-options.queries";
import { useBranches } from "@/modules/settings/branches/public";
import { AddUnitsForm } from "./AddUnitsForm";
import { useAddUnitsToEquipmentType } from "./add-units.mutation";
import { toAddUnitsToEquipmentTypeDto } from "./add-units.schema";

export function AddUnitsDialog({
	equipmentTypeId,
	open,
	onOpenChange,
}: {
	equipmentTypeId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const formId = useId();
	const { data: branches = [] } = useBranches({ isActive: true });
	const { data: owners = [] } = useOwnerOptions();
	const { mutateAsync: addUnitsToEquipmentType, isPending } =
		useAddUnitsToEquipmentType();

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Añadir unidades</DialogTitle>
					<DialogDescription>
						Carga una o más unidades físicas para este tipo de equipo.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<AddUnitsForm
						key={equipmentTypeId}
						formId={formId}
						branches={branches}
						owners={owners}
						isPending={isPending}
						onCancel={() => onOpenChange(false)}
						onSubmit={async (values) => {
							await addUnitsToEquipmentType({
								equipmentTypeId,
								body: toAddUnitsToEquipmentTypeDto(values),
							});
							onOpenChange(false);
						}}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
