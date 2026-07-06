import { UserPlus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { useRentalDetailContext } from "../detail/rental-detail.context";
import { useAssignCustomerToDraftRental } from "./assign-customer-to-draft-rental.mutation";
import {
	type AssignCustomerToDraftRentalFormValues,
	toAssignCustomerToDraftRentalDto,
} from "./assign-customer-to-draft-rental.schema";
import { AssignCustomerToDraftRentalForm } from "./assign-customer-to-draft-rental-form";

export function AssignCustomerToDraftRentalDialog() {
	const { rental } = useRentalDetailContext();
	const [open, setOpen] = useState(false);
	const assignCustomer = useAssignCustomerToDraftRental();

	async function handleSubmit(values: AssignCustomerToDraftRentalFormValues) {
		const body = toAssignCustomerToDraftRentalDto(values);
		await assignCustomer.mutateAsync({ rentalId: rental.id, body });
		setOpen(false);
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button type="button" size="sm">
						<UserPlus className="size-4" />
						Asignar cliente
					</Button>
				}
			/>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Asignar cliente al borrador</DialogTitle>
					<DialogDescription>
						Buscá y seleccioná el cliente que querés vincular a este pedido.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<AssignCustomerToDraftRentalForm
						onSubmit={handleSubmit}
						onCancel={() => setOpen(false)}
						isPending={assignCustomer.isPending}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
