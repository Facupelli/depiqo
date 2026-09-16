import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

export function UnitRowActionsMenu({ children }: { children: ReactNode }) {
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
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
