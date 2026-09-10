import type { GetEquipmentTypeAssetsItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	Archive,
	CirclePlay,
	CircleStop,
	MoreHorizontal,
	Pencil,
	UserRound,
} from "lucide-react";

type EquipmentUnit = GetEquipmentTypeAssetsItemDto;

export type UnitRowActionsMenuProps = {
	unit: EquipmentUnit;
	onEdit: (unit: EquipmentUnit) => void;
	onChangeOwner: (unit: EquipmentUnit) => void;
	onDeactivate: (unit: EquipmentUnit) => void;
	onReactivate: (unit: EquipmentUnit) => void;
	onRetire: (unit: EquipmentUnit) => void;
	isLifecyclePending: boolean;
};

export function UnitRowActionsMenu({
	unit,
	onEdit,
	onChangeOwner,
	onDeactivate,
	onReactivate,
	onRetire,
	isLifecyclePending,
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
					<Pencil className="mr-2 size-4" />
					Editar
				</DropdownMenuItem>
				<DropdownMenuItem onClick={() => onChangeOwner(unit)}>
					<UserRound className="mr-2 size-4" />
					Cambiar propietario
				</DropdownMenuItem>
				{unit.status === "ACTIVE" ? (
					<DropdownMenuItem
						disabled={isLifecyclePending}
						onClick={() => onDeactivate(unit)}
					>
						<CircleStop className="mr-2 size-4" />
						Inactivar
					</DropdownMenuItem>
				) : null}
				{unit.status === "INACTIVE" ? (
					<DropdownMenuItem
						disabled={isLifecyclePending}
						onClick={() => onReactivate(unit)}
					>
						<CirclePlay className="mr-2 size-4" />
						Reactivar
					</DropdownMenuItem>
				) : null}
				{unit.status !== "RETIRED" ? <DropdownMenuSeparator /> : null}
				{unit.status !== "RETIRED" ? (
					<DropdownMenuItem
						disabled={isLifecyclePending}
						onClick={() => onRetire(unit)}
						variant="destructive"
					>
						<Archive className="mr-2 size-4" />
						Retirar
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
