import { useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useOwners } from "@/v2/features/asset-inventory/owners/owners.queries";
import { useBranches } from "@/v2/features/tenant-management/branch/branch.queries";
import { useCreateEquipmentType } from "./create-equipment-type.mutation";
import { toCreateEquipmentTypeDto } from "./create-equipment-type.schema";
import { CreateEquipmentTypeForm } from "./create-equipment-type-form";

export function CreateEquipmentTypeDialog() {
	const [open, setOpen] = useState(false);
	const formId = useId();
	const navigate = useNavigate();
	const { data: branches = [] } = useBranches({ isActive: true });
	const { data: owners = [] } = useOwners();
	const { mutateAsync: createEquipmentType, isPending } =
		useCreateEquipmentType();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button>
						<Plus className="mr-2 h-4 w-4" />
						Crear equipo
					</Button>
				}
			/>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Crear equipo</DialogTitle>
					<DialogDescription>
						Registra un tipo de equipo y, opcionalmente, carga sus activos
						iniciales.
					</DialogDescription>
				</DialogHeader>

				{open && (
					<CreateEquipmentTypeForm
						formId={formId}
						branches={branches}
						owners={owners}
						isPending={isPending}
						onCancel={() => setOpen(false)}
						onSubmit={async (values) => {
							const response = await createEquipmentType(
								toCreateEquipmentTypeDto(values),
							);
							setOpen(false);
							navigate({
								to: "/dashboard/inventory/equipment-types/$equipmentTypeId",
								params: { equipmentTypeId: response.equipmentTypeId },
							});
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
