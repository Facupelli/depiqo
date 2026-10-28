import type { InvoiceDto } from "@repo/api-contracts";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";
import { type InvoicingUiError, toInvoicingUiError } from "./invoicing.errors";
import { useRemoveInvoiceRegistration } from "./invoicing.mutations";

export function RemoveInvoiceRegistrationAlertDialog({
	invoice,
	blockedMessage,
	onClose,
	onRemoved,
}: {
	invoice: InvoiceDto;
	blockedMessage: string | null;
	onClose: () => void;
	onRemoved: () => void;
}) {
	const removeInvoice = useRemoveInvoiceRegistration();
	const [serverError, setServerError] = useState<InvoicingUiError | null>(null);
	const submissionBlocked = blockedMessage !== null || Boolean(
		serverError && serverError.kind !== "validation" && serverError.kind !== "unknown",
	);

	async function handleRemove() {
		if (removeInvoice.isPending || submissionBlocked) return;
		setServerError(null);
		try {
			await removeInvoice.mutateAsync({
				rentalId: invoice.rentalId,
				invoiceId: invoice.id,
				query: { expectedVersion: invoice.version },
			});
			toast.success("Registro de factura eliminado de Depiqo");
			onRemoved();
		} catch (error) {
			setServerError(toInvoicingUiError(
				error,
				"No pudimos eliminar el registro. Revisá tu conexión e intentá nuevamente.",
			));
		}
	}

	return (
		<AlertDialog
			open
			onOpenChange={(open) => {
				if (!open && !removeInvoice.isPending) onClose();
			}}
		>
			<AlertDialogContent className="max-h-[calc(100dvh-2rem)] max-w-[calc(100%-2rem)] overflow-y-auto">
				<AlertDialogHeader>
					<AlertDialogTitle>Eliminar registro de factura</AlertDialogTitle>
					<AlertDialogDescription>
						Se eliminará únicamente el registro de esta factura en Depiqo.
						La factura del sistema externo no se cancelará ni se eliminará.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<div className="min-w-0 space-y-1 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
					<p className="text-sm font-medium [overflow-wrap:anywhere]">
						{invoice.reference}
					</p>
					<p className="break-words font-mono text-sm text-neutral-600">
						{formatExactCurrencyRate(invoice.amount, invoice.currency)} {invoice.currency}
					</p>
				</div>
				{serverError ? (
					<div className="space-y-2 text-sm text-destructive" role="alert">
						<p>{serverError.message}</p>
						{submissionBlocked ? (
							<p>Cerrá este diálogo y revisá el registro actual antes de volver a intentarlo.</p>
						) : null}
						{serverError.kind === "unauthorized" ? (
							<a href="/login" className="font-medium underline underline-offset-4">
								Volver a iniciar sesión
							</a>
						) : null}
					</div>
				) : blockedMessage && !removeInvoice.isPending ? (
					<p className="text-sm text-destructive" role="alert">{blockedMessage}</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={removeInvoice.isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						disabled={removeInvoice.isPending || submissionBlocked}
						onClick={(event) => {
							event.preventDefault();
							void handleRemove();
						}}
					>
						{removeInvoice.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
						{removeInvoice.isPending ? "Eliminando..." : "Eliminar registro"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
