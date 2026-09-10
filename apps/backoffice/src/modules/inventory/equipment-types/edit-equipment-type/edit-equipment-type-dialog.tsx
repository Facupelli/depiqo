import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useId } from "react";
import { useCategories } from "@/modules/settings/categories/public";
import { equipmentTypeSummaryQueries } from "../equipment-type-detail/equipment-type-summary.queries";
import { useUpdateEquipmentType } from "./edit-equipment-type.mutation";
import {
	fromEquipmentTypeSummaryToEditFormValues,
	toUpdateEquipmentTypeDto,
} from "./edit-equipment-type.schema";
import { EditEquipmentTypeForm } from "./edit-equipment-type-form";

interface EditEquipmentTypeDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	equipmentTypeId: string;
}

export function EditEquipmentTypeDialog({
	open,
	onOpenChange,
	equipmentTypeId,
}: EditEquipmentTypeDialogProps) {
	const formId = useId();
	const { data: categories = [] } = useCategories();
	const equipmentTypeQuery = useQuery({
		...equipmentTypeSummaryQueries.summary(equipmentTypeId),
		enabled: open,
	});
	const { mutateAsync: updateEquipmentType, isPending } =
		useUpdateEquipmentType();
	const equipmentType = equipmentTypeQuery.data;
	const selectableCategories = equipmentType
		? categories.filter(
				(category) =>
					category.isActive || category.id === equipmentType.categoryId,
			)
		: [];

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Editar equipo</DialogTitle>
					<DialogDescription>
						{equipmentType
							? `Actualiza la información de ${equipmentType.name}.`
							: "Carga la información del equipo para editarla."}
					</DialogDescription>
				</DialogHeader>

				{equipmentTypeQuery.isPending ? (
					<div className="space-y-4 py-2">
						<Skeleton className="h-9 w-full" />
						<Skeleton className="h-24 w-full" />
						<Skeleton className="h-9 w-full" />
					</div>
				) : equipmentTypeQuery.isError || !equipmentType ? (
					<div className="space-y-4 py-4">
						<p className="text-destructive text-sm">
							No pudimos cargar el equipo. Inténtalo nuevamente.
						</p>
						<Button
							type="button"
							variant="outline"
							onClick={() => equipmentTypeQuery.refetch()}
						>
							Reintentar
						</Button>
					</div>
				) : (
					<EditEquipmentTypeForm
						key={equipmentType.id}
						formId={formId}
						defaultValues={fromEquipmentTypeSummaryToEditFormValues(
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
