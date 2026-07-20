import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { useRentalDetailContext } from "../detail/rental-detail.context";
import { getAssignCustomerToDraftRentalErrorMessage } from "./assign-customer-to-draft-rental.errors";
import { useAssignCustomerToDraftRental } from "./assign-customer-to-draft-rental.mutation";
import {
	type AssignCustomerToDraftRentalFormValues,
	toAssignCustomerToDraftRentalDto,
} from "./assign-customer-to-draft-rental.schema";
import { AssignCustomerToDraftRentalForm } from "./assign-customer-to-draft-rental-form";

export function AssignCustomerToDraftRentalDialog() {
	const { rental } = useRentalDetailContext();
	const [open, setOpen] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const assignCustomer = useAssignCustomerToDraftRental();

	async function handleSubmit(values: AssignCustomerToDraftRentalFormValues) {
		setErrorMessage(null);

		try {
			const body = toAssignCustomerToDraftRentalDto(values);
			await assignCustomer.mutateAsync({ rentalId: rental.id, body });
			setOpen(false);
		} catch (error) {
			setErrorMessage(getAssignCustomerToDraftRentalErrorMessage(error));
		}
	}

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			setErrorMessage(null);
		}
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger
				render={
					<Button type="button" size="sm">
						<UserPlus className="size-4" />
						Asignar cliente
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Asignar cliente al borrador</DialogTitle>
					<DialogDescription>
						Buscá y seleccioná el cliente que querés vincular a este pedido.
					</DialogDescription>
				</DialogHeader>
				{errorMessage ? (
					<p className="text-destructive text-sm">{errorMessage}</p>
				) : null}
				{open ? (
					<AssignCustomerToDraftRentalForm
						onSubmit={handleSubmit}
						onCancel={() => handleOpenChange(false)}
						isPending={assignCustomer.isPending}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
