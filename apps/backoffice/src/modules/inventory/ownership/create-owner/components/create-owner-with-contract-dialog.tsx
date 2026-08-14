import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useCreateOwnerWithContract } from "../create-owner-with-contract.mutation";
import { CreateOwnerWithContractForm } from "./create-owner-with-contract-form";
import { toCreateOwnerWithContractDto } from "./create-owner-with-contract-form.schema";

const formId = "create-v2-owner-with-contract";

interface CreateOwnerWithContractDialogProps {
	triggerLabel?: string;
}

export function CreateOwnerWithContractDialog({
	triggerLabel = "Nuevo Propietario",
}: CreateOwnerWithContractDialogProps) {
	const [open, setOpen] = useState(false);
	const { mutateAsync: createOwnerWithContract, isPending } =
		useCreateOwnerWithContract();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button>
						<Plus className="mr-1.5 h-4 w-4" />
						{triggerLabel}
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Nuevo Propietario</DialogTitle>
					<DialogDescription>
						Registra el propietario y configura su contrato inicial.
					</DialogDescription>
				</DialogHeader>

				{open && (
					<CreateOwnerWithContractForm
						formId={formId}
						isPending={isPending}
						onCancel={() => setOpen(false)}
						onSubmit={async (values) => {
							await createOwnerWithContract({
								body: toCreateOwnerWithContractDto(values),
							});
							setOpen(false);
						}}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}
