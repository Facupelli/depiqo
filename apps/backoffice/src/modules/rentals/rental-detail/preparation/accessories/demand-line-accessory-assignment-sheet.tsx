import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import type { RentalDetailViewDemandLineDto } from "../../get-rental-detail-view/get-rental-detail-view.schema";

interface DemandLineAccessoryAssignmentSheetProps {
	demandLine: RentalDetailViewDemandLineDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DemandLineAccessoryAssignmentSheet({
	demandLine,
	open,
	onOpenChange,
}: DemandLineAccessoryAssignmentSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full max-w-full min-w-0 gap-0 overflow-hidden p-0 data-[side=right]:w-[90%] data-[side=right]:sm:max-w-160">
				<SheetHeader className="min-w-0 border-neutral-200 border-b px-4 py-5 sm:px-6">
					<SheetTitle>Asignar accesorios</SheetTitle>
					<SheetDescription>
						{demandLine
							? `Equipo: ${demandLine.equipmentTypeName}`
							: "Selecciona un equipo para gestionar sus accesorios."}
					</SheetDescription>
				</SheetHeader>
				<div className="min-w-0 flex-1 px-4 py-6 sm:px-6">
					<p className="text-muted-foreground text-sm">
						La gestión de accesorios para este equipo estará disponible
						próximamente.
					</p>
				</div>
			</SheetContent>
		</Sheet>
	);
}
