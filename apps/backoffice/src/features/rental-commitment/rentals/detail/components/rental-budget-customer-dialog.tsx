import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { RentalBudgetCustomerForm } from "./rental-budget-customer-form";

interface RentalBudgetCustomerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	isPending: boolean;
	onSubmit: Parameters<typeof RentalBudgetCustomerForm>[0]["onSubmit"];
}

export function RentalBudgetCustomerDialog({
	open,
	onOpenChange,
	isPending,
	onSubmit,
}: RentalBudgetCustomerDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Datos para el presupuesto</DialogTitle>
					<DialogDescription>
						Ingresá los datos del cliente para generar el presupuesto. Estos
						datos no se guardarán en el pedido.
					</DialogDescription>
				</DialogHeader>

				{open ? (
					<RentalBudgetCustomerForm
						key="rental-budget-customer-form"
						isPending={isPending}
						onSubmit={onSubmit}
						onCancel={() => onOpenChange(false)}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
