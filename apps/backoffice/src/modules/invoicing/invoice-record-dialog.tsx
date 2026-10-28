import {
	type InvoiceDto,
	type InvoiceHistoryEntryDto,
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ExternalLink } from "lucide-react";
import { type ReactNode, useState } from "react";
import { can } from "@/auth/permissions";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { getProblemDetailsStatus } from "@/shared/errors";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";
import { formatInvoiceDate } from "./invoice.utils";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import type { InvoiceRowAction } from "./invoice-list-row";
import { toInvoicingUiError } from "./invoicing.errors";
import { invoicingKeys, invoicingQueries } from "./invoicing.queries";
import { RemoveInvoiceRegistrationAlertDialog } from "./remove-invoice-registration-alert-dialog";

export function InvoiceRecordDialog(props: {
	invoice: InvoiceDto;
	action: InvoiceRowAction;
	permissions: readonly TenantPermissionId[];
	onClose: () => void;
}) {
	if (!can(props.permissions, TenantPermission.InvoicingRead)) return null;
	if (
		props.action !== "history" &&
		!can(props.permissions, TenantPermission.InvoicingManage)
	) {
		return null;
	}

	return <AvailableInvoiceRecordDialog {...props} />;
}

function AvailableInvoiceRecordDialog({
	invoice: listedInvoice,
	action,
	permissions,
	onClose,
}: {
	invoice: InvoiceDto;
	action: InvoiceRowAction;
	permissions: readonly TenantPermissionId[];
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const timezone = useTenantTimezone();
	const query = useQuery(
		invoicingQueries.invoiceDetail(listedInvoice.id, {
			permissions,
			includeRemoved: true,
		}),
	);
	const invoice = canShowQueryData(query.error) ? query.data : undefined;

	function handleClose() {
		if (
			getProblemDetailsStatus(query.error) === 404 ||
			query.data?.removedAt ||
			(query.data && query.data.version !== listedInvoice.version)
		) {
			void queryClient.invalidateQueries({
				queryKey: invoicingKeys.rentalLists(listedInvoice.rentalId),
			});
		}
		onClose();
	}

	// Wait for the opening recheck before capturing the editable snapshot.
	// Once mounted, keep that snapshot and any user edits through background updates.
	if (action !== "history" && query.isFetchedAfterMount && query.data) {
		return (
			<InvoiceMutationDialog
				invoice={query.data}
				action={action}
				error={query.error}
				onClose={handleClose}
			/>
		);
	}

	return (
		<Dialog open onOpenChange={(open) => !open && handleClose()}>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
				<DialogHeader className="pr-6">
					<DialogTitle>
						{action === "history"
							? "Historial de la factura"
							: action === "correct"
								? "Editar registro"
								: "Eliminar registro"}
					</DialogTitle>
					<DialogDescription className="[overflow-wrap:anywhere]">
						{listedInvoice.reference}
					</DialogDescription>
				</DialogHeader>
				{query.error ? (
					<InvoiceQueryError
						error={query.error}
						fallback={
							invoice
								? "No pudimos actualizar el registro. La información mostrada puede estar desactualizada."
								: "No pudimos cargar el registro de la factura. Intentá nuevamente."
						}
						isFetching={query.isFetching}
						onRetry={() => void query.refetch()}
					/>
				) : null}
				{action === "history" && invoice ? (
					<>
						{invoice.removedAt ? (
							<p className="text-xs text-neutral-500">
								Registro eliminado de Depiqo. La factura externa no se modificó.
							</p>
						) : null}
						<ol className="space-y-4 border-l border-neutral-200 pl-4">
							{invoice.history.map((entry) => (
								<li key={entry.id} className="min-w-0 space-y-2">
									<div>
										<p className="text-sm font-medium text-neutral-950">
											{historyActionLabels[entry.action]}
										</p>
										<time
											dateTime={entry.occurredAt}
											className="text-xs text-neutral-500"
										>
											{formatTimestampInTimezone(
												entry.occurredAt,
												timezone,
												"DD/MM/YYYY HH:mm",
											)}
										</time>
									</div>
									<details className="group/snapshot">
										<summary className="flex cursor-pointer list-none items-center gap-1 rounded-sm text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
											Ver datos registrados
											<ChevronDown className="size-3.5 shrink-0 transition-transform group-open/snapshot:rotate-180" />
										</summary>
										<InvoiceSnapshot invoice={entry.snapshot} />
									</details>
								</li>
							))}
						</ol>
					</>
				) : !query.error ? (
					<section
						className="space-y-2"
						aria-busy="true"
						aria-label="Cargando registro"
					>
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</section>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function InvoiceMutationDialog({
	invoice,
	action,
	error,
	onClose,
}: {
	invoice: InvoiceDto;
	action: "correct" | "remove";
	error: unknown;
	onClose: () => void;
}) {
	const [snapshot] = useState(invoice);
	let blockedMessage: string | null = null;
	if (error) {
		blockedMessage = toInvoicingUiError(
			error,
			"No pudimos actualizar el registro. Cerrá el diálogo e intentá cargarlo nuevamente.",
		).message;
	} else if (invoice.removedAt) {
		blockedMessage =
			"El registro ya fue eliminado de Depiqo. Cerrá el diálogo para revisar la información actual.";
	} else if (invoice.version !== snapshot.version) {
		blockedMessage =
			"El registro cambió. Cerrá el diálogo y revisá la información actual antes de continuar.";
	}

	return action === "correct" ? (
		<InvoiceFormDialog
			mode="correct"
			open
			onOpenChange={(open) => !open && onClose()}
			invoice={snapshot}
			blockedMessage={blockedMessage}
		/>
	) : (
		<RemoveInvoiceRegistrationAlertDialog
			invoice={snapshot}
			blockedMessage={blockedMessage}
			onClose={onClose}
			onRemoved={onClose}
		/>
	);
}

const historyActionLabels = {
	REGISTERED: "Registrada",
	CORRECTED: "Corregida",
	REMOVED: "Registro eliminado",
} satisfies Record<InvoiceHistoryEntryDto["action"], string>;

function InvoiceSnapshot({ invoice }: { invoice: InvoiceDto }) {
	return (
		<dl className="mt-2 grid min-w-0 gap-3 rounded-md bg-neutral-50 p-3 sm:grid-cols-2">
			<InvoiceMetadataField label="Referencia">
				{invoice.reference}
			</InvoiceMetadataField>
			<InvoiceMetadataField label="Fecha de emisión">
				<time dateTime={invoice.issuedOn}>
					{formatInvoiceDate(invoice.issuedOn)}
				</time>
			</InvoiceMetadataField>
			<InvoiceMetadataField label="Importe">
				<span className="font-mono">
					{formatExactCurrencyRate(invoice.amount, invoice.currency)}
				</span>
			</InvoiceMetadataField>
			{invoice.sourceSystem ? (
				<InvoiceMetadataField label="Sistema de origen">
					{invoice.sourceSystem}
				</InvoiceMetadataField>
			) : null}
			{invoice.externalUrl ? (
				<InvoiceMetadataField label="Enlace externo">
					<a
						href={invoice.externalUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
					>
						Abrir factura externa
						<ExternalLink className="size-3.5 shrink-0" />
					</a>
				</InvoiceMetadataField>
			) : null}
		</dl>
	);
}

function InvoiceMetadataField({
	label,
	children,
}: {
	label: string;
	children: ReactNode;
}) {
	return (
		<div className="min-w-0 space-y-1">
			<dt className="text-xs text-neutral-500">{label}</dt>
			<dd className="text-sm text-neutral-950 [overflow-wrap:anywhere]">
				{children}
			</dd>
		</div>
	);
}

function canShowQueryData(error: unknown): boolean {
	const status = getProblemDetailsStatus(error);
	return status !== 401 && status !== 403 && status !== 404;
}

function InvoiceQueryError({
	error,
	fallback,
	isFetching,
	onRetry,
}: {
	error: unknown;
	fallback: string;
	isFetching: boolean;
	onRetry: () => void;
}) {
	const uiError = toInvoicingUiError(error, fallback);
	return (
		<div className="space-y-2 text-sm" role="alert">
			<p className="text-destructive">{uiError.message}</p>
			{uiError.kind === "unauthorized" ? (
				<a
					href="/login"
					className="font-medium text-primary underline underline-offset-4"
				>
					Volver a iniciar sesión
				</a>
			) : canShowQueryData(error) ? (
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={isFetching}
					onClick={onRetry}
				>
					{isFetching ? "Actualizando..." : "Reintentar"}
				</Button>
			) : null}
		</div>
	);
}
