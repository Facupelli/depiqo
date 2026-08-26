import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Archive, MoreHorizontal, Pencil } from "lucide-react";

type EquipmentUnit = GetEquipmentTypeDetailResponseDto["assets"][number];

export type UnitRowActionsMenuProps = {
	unit: EquipmentUnit;
	onEdit: (unit: EquipmentUnit) => void;
	onRetire: (unit: EquipmentUnit) => void;
};

export function UnitRowActionsMenu({
	unit,
	onEdit,
	onRetire,
}: UnitRowActionsMenuProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Acciones de la unidad"
					>
						<MoreHorizontal className="size-4" />
					</Button>
				}
			/>

			<DropdownMenuContent align="end" className="w-56">
				<DropdownMenuItem onClick={() => onEdit(unit)}>
					<Pencil className="mr-2 h-4 w-4" />
					Editar
				</DropdownMenuItem>
				{unit.status !== "RETIRED" ? (
					<DropdownMenuItem
						onClick={() => onRetire(unit)}
						variant="destructive"
					>
						<Archive className="mr-2 h-4 w-4" />
						Marcar como retirado
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
