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
	Send,
	Trash2,
} from "lucide-react";

export type RentalActionsDropdownProps = {
	isDraftRental: boolean;
	canConfirmRental: boolean;
	isConfirming: boolean;
	canSendSigningInvitation: boolean;
	isSendingSigningInvitation: boolean;
	canCancelRental: boolean;
	isCancelling: boolean;
	isOpeningRemito: boolean;
	isOpeningBudget: boolean;
	onOpenConfirmDialog: () => void;
	onOpenRemito: () => void;
	onOpenBudget: () => void;
	onOpenSigningDialog: () => void;
	onOpenCancelDialog: () => void;
};

export function RentalActionsDropdown({
	isDraftRental,
	canConfirmRental,
	isConfirming,
	canSendSigningInvitation,
	isSendingSigningInvitation,
	canCancelRental,
	isCancelling,
	isOpeningRemito,
	isOpeningBudget,
	onOpenConfirmDialog,
	onOpenRemito,
	onOpenBudget,
	onOpenSigningDialog,
	onOpenCancelDialog,
}: RentalActionsDropdownProps) {
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
				{isDraftRental ? (
					<DropdownMenuItem
						onClick={onOpenConfirmDialog}
						disabled={!canConfirmRental || isConfirming}
					>
						<CheckCircle2 className="mr-2 h-4 w-4" />
						{isConfirming ? "Confirmando..." : "Confirmar alquiler"}
					</DropdownMenuItem>
				) : null}
				{isDraftRental ? (
					<DropdownMenuItem onClick={onOpenBudget} disabled={isOpeningBudget}>
						<FileText className="mr-2 h-4 w-4" />
						{isOpeningBudget ? "Abriendo presupuesto..." : "Ver presupuesto"}
					</DropdownMenuItem>
				) : (
					<>
						<DropdownMenuItem onClick={onOpenRemito} disabled={isOpeningRemito}>
							<FileText className="mr-2 h-4 w-4" />
							{isOpeningRemito ? "Abriendo remito..." : "Ver remito"}
						</DropdownMenuItem>
						<DropdownMenuItem
							onClick={onOpenSigningDialog}
							disabled={!canSendSigningInvitation || isSendingSigningInvitation}
						>
							<Send className="mr-2 h-4 w-4" />
							Enviar remito a firmar
						</DropdownMenuItem>
					</>
				)}
				<DropdownMenuItem
					onClick={onOpenCancelDialog}
					disabled={!canCancelRental || isCancelling}
					variant="destructive"
				>
					<Trash2 className="mr-2 h-4 w-4" />
					{isCancelling ? "Cancelando..." : "Cancelar alquiler"}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
