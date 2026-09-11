import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

interface DemandLineRowActionsProps {
	equipmentTypeName: string;
	rentalDemandLineId: string;
	onAssignAccessories: (rentalDemandLineId: string) => void;
}

export function DemandLineRowActions({
	equipmentTypeName,
	rentalDemandLineId,
	onAssignAccessories,
}: DemandLineRowActionsProps) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-6 text-neutral-500"
						aria-label={`Acciones para ${equipmentTypeName}`}
					>
						<MoreHorizontal className="size-3.5" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end">
				<DropdownMenuItem
					onClick={() => onAssignAccessories(rentalDemandLineId)}
				>
					Asignar accesorios
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
