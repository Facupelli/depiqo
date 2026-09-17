import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import {
	CheckCircle2,
	ChevronDown,
	FileText,
	Pencil,
	Send,
	Trash2,
} from "lucide-react";
import { Children, type ReactNode } from "react";

export function RentalActionsDropdown({ children }: { children: ReactNode }) {
	if (Children.toArray(children).length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button variant="outline">
						Acciones
						<ChevronDown className="size-4" />
					</Button>
				}
			/>

			<DropdownMenuContent align="end" className="w-60">
				{children}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

export function EditDraftAction({ onSelect }: { onSelect: () => void }) {
	return (
		<DropdownMenuItem onClick={onSelect}>
			<Pencil className="mr-2 h-4 w-4" />
			Editar
		</DropdownMenuItem>
	);
}

export function ConfirmRentalAction({
	disabled,
	isPending,
	onSelect,
}: {
	disabled: boolean;
	isPending: boolean;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem onClick={onSelect} disabled={disabled || isPending}>
			<CheckCircle2 className="mr-2 h-4 w-4" />
			{isPending ? "Confirmando..." : "Confirmar alquiler"}
		</DropdownMenuItem>
	);
}

export function BudgetAction({
	isPending,
	onSelect,
}: {
	isPending: boolean;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem onClick={onSelect} disabled={isPending}>
			<FileText className="mr-2 h-4 w-4" />
			{isPending ? "Abriendo presupuesto..." : "Ver presupuesto"}
		</DropdownMenuItem>
	);
}

export function RemitoAction({
	isPending,
	onSelect,
}: {
	isPending: boolean;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem onClick={onSelect} disabled={isPending}>
			<FileText className="mr-2 h-4 w-4" />
			{isPending ? "Abriendo remito..." : "Ver remito"}
		</DropdownMenuItem>
	);
}

export function SigningInvitationAction({
	disabled,
	isPending,
	onSelect,
}: {
	disabled: boolean;
	isPending: boolean;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem onClick={onSelect} disabled={disabled || isPending}>
			<Send className="mr-2 h-4 w-4" />
			Enviar remito a firmar
		</DropdownMenuItem>
	);
}

export function CancelRentalAction({
	disabled,
	isPending,
	onSelect,
}: {
	disabled: boolean;
	isPending: boolean;
	onSelect: () => void;
}) {
	return (
		<DropdownMenuItem
			onClick={onSelect}
			disabled={disabled || isPending}
			variant="destructive"
		>
			<Trash2 className="mr-2 h-4 w-4" />
			{isPending ? "Cancelando..." : "Cancelar alquiler"}
		</DropdownMenuItem>
	);
}
