import { Alert, AlertDescription } from "@repo/ui/components/alert";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { createRentalSigningInvitationFormDefaults } from "./rental-signing-invitation.schema";
import { RentalSigningInvitationForm } from "./rental-signing-invitation-form";

interface RentalSigningInvitationDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultEmail: string | null | undefined;
	submitError: string | null;
	isPending: boolean;
	onSubmit: Parameters<typeof RentalSigningInvitationForm>[0]["onSubmit"];
}

export function RentalSigningInvitationDialog({
	open,
	onOpenChange,
	defaultEmail,
	submitError,
	isPending,
	onSubmit,
}: RentalSigningInvitationDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Enviar remito a firmar</DialogTitle>
					<DialogDescription>
						Se enviará un enlace seguro por email para revisar y firmar el
						remito del alquiler.
					</DialogDescription>
				</DialogHeader>

				{open ? (
					<div className="space-y-6">
						{submitError ? (
							<Alert variant="destructive">
								<AlertDescription>{submitError}</AlertDescription>
							</Alert>
						) : null}

						<RentalSigningInvitationForm
							key={defaultEmail ?? ""}
							defaultValues={createRentalSigningInvitationFormDefaults(
								defaultEmail,
							)}
							isPending={isPending}
							onSubmit={onSubmit}
							onCancel={() => onOpenChange(false)}
						/>
					</div>
				) : null}
			</DialogContent>
		</Dialog>
	);
}
