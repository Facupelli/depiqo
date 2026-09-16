import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export function EquipmentListRowActions({
	equipmentName,
	children,
}: {
	equipmentName: string;
	children: ReactNode;
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
				className="min-w-64"
				onClick={(event) => event.stopPropagation()}
			>
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
