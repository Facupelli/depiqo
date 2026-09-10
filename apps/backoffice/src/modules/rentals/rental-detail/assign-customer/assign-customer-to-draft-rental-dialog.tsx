import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { UserPlus } from "lucide-react";
import { type ReactElement, type ReactNode, useState } from "react";
import { useRentalDetailContext } from "../rental-detail.context";
import { getAssignCustomerToDraftRentalErrorMessage } from "./assign-customer-to-draft-rental.errors";
import { useAssignCustomerToDraftRental } from "./assign-customer-to-draft-rental.mutation";
import {
	type AssignCustomerToDraftRentalFormValues,
	toAssignCustomerToDraftRentalDto,
} from "./assign-customer-to-draft-rental.schema";
import { AssignCustomerToDraftRentalForm } from "./assign-customer-to-draft-rental-form";

type AssignCustomerToDraftRentalDialogProps = {
	trigger?: ReactElement;
	renderTrigger?: (trigger: ReactElement) => ReactNode;
	unavailableFallback?: ReactNode;
};

export function AssignCustomerToDraftRentalDialog({
	trigger,
	renderTrigger = (dialogTrigger) => dialogTrigger,
	unavailableFallback = null,
}: AssignCustomerToDraftRentalDialogProps = {}) {
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

	const canAssignCustomer =
		rental.customerId === null && rental.status === "DRAFT";

	if (!canAssignCustomer) {
		return unavailableFallback;
	}

	const dialogTrigger = (
		<DialogTrigger
			render={
				trigger ?? (
					<Button type="button" size="sm">
						<UserPlus className="size-4" />
						Asignar cliente
					</Button>
				)
			}
		/>
	);

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			{renderTrigger(dialogTrigger)}
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
				<DialogHeader>
					<DialogTitle>Asignar cliente al borrador</DialogTitle>
					<DialogDescription>
						Buscá y seleccioná el cliente que querés vincular a este pedido.
					</DialogDescription>
				</DialogHeader>
				{errorMessage ? (
					<p className="text-destructive text-sm [overflow-wrap:anywhere]">
						{errorMessage}
					</p>
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
