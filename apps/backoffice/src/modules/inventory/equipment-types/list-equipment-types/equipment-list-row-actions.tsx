import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontal, PackagePlus, Pencil } from "lucide-react";

export function EquipmentListRowActions({
	equipmentName,
	onEdit,
	onAddUnit,
}: {
	equipmentName: string;
	onEdit: () => void;
	onAddUnit: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Acciones para ${equipmentName}`}
						onClick={(event) => event.stopPropagation()}
					>
						<MoreHorizontal className="size-4" />
					</Button>
				}
			/>
			<DropdownMenuContent
				align="end"
				onClick={(event) => event.stopPropagation()}
			>
				<DropdownMenuItem onClick={onEdit}>
					<Pencil className="size-4" />
					Editar equipo
				</DropdownMenuItem>
				<DropdownMenuItem onClick={onAddUnit}>
					<PackagePlus className="size-4" />
					Añadir unidad
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
