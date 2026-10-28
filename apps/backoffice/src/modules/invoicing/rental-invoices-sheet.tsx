import {
	type InvoiceDto,
	type InvoiceHistoryEntryDto,
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldLabel } from "@repo/ui/components/field";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, ExternalLink, Pencil, Trash2 } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { can } from "@/auth/permissions";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { getProblemDetailsStatus } from "@/shared/errors";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { InvoiceListRow } from "./invoice-list-row";
import { formatInvoiceDate } from "./invoice.utils";
import { toInvoicingUiError } from "./invoicing.errors";
import { invoicingKeys, invoicingQueries } from "./invoicing.queries";
import { RemoveInvoiceRegistrationAlertDialog } from "./remove-invoice-registration-alert-dialog";

type RentalInvoicesSheetProps = {
	rentalId: string;
	permissions: readonly TenantPermissionId[];
	initialInvoiceId: string | null;
	onClose: () => void;
};

export function RentalInvoicesSheet(props: RentalInvoicesSheetProps) {
	if (!can(props.permissions, TenantPermission.InvoicingRead)) return null;

	return (
		<Sheet open onOpenChange={(open) => !open && props.onClose()}>
			<SheetContent className="w-full max-w-full min-w-0 gap-0 overflow-hidden p-0 data-[side=right]:w-[90%] data-[side=right]:sm:max-w-160">
				<SheetHeader className="min-w-0 border-b border-neutral-200 px-4 py-5 pr-14 sm:px-6 sm:pr-14">
					<SheetTitle>Facturas</SheetTitle>
					<SheetDescription>
						Registros de facturas emitidas fuera de Depiqo.
					</SheetDescription>
				</SheetHeader>
				<InvoiceBrowser key={props.rentalId} {...props} />
			</SheetContent>
		</Sheet>
	);
}

function InvoiceBrowser({
	rentalId,
	permissions,
	initialInvoiceId,
}: RentalInvoicesSheetProps) {
	const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialInvoiceId);
	const [includeRemoved, setIncludeRemoved] = useState(false);
	const removedToggleId = useId();

	if (selectedInvoiceId) {
		return (
			<InvoiceDetail
				key={selectedInvoiceId}
				rentalId={rentalId}
				invoiceId={selectedInvoiceId}
				permissions={permissions}
				onBack={() => setSelectedInvoiceId(null)}
			/>
		);
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<Field
				orientation="horizontal"
				className="items-center gap-2 border-b border-neutral-100 px-4 py-3 sm:px-6"
			>
				<Checkbox
					id={removedToggleId}
					checked={includeRemoved}
					onCheckedChange={(checked) => setIncludeRemoved(checked === true)}
				/>
				<FieldLabel htmlFor={removedToggleId} className="text-xs text-neutral-600">
					Mostrar registros eliminados
				</FieldLabel>
			</Field>
			<InvoiceList
				key={includeRemoved ? "all" : "active"}
				rentalId={rentalId}
				permissions={permissions}
				includeRemoved={includeRemoved}
				onSelect={setSelectedInvoiceId}
			/>
		</div>
	);
}

function InvoiceList({
	rentalId,
	permissions,
	includeRemoved,
	onSelect,
}: {
	rentalId: string;
	permissions: readonly TenantPermissionId[];
	includeRemoved: boolean;
	onSelect: (invoiceId: string) => void;
}) {
	const query = useQuery(
		invoicingQueries.rentalList(rentalId, { permissions, includeRemoved }),
	);
	const invoices = canShowQueryData(query.error) ? query.data : undefined;

	return (
		<div className="min-h-0 min-w-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
			{query.error ? (
				<InvoiceQueryError
					error={query.error}
					fallback={
						invoices
							? "No pudimos actualizar la lista. La información mostrada puede estar desactualizada."
							: "No pudimos cargar las facturas. Revisá tu conexión e intentá nuevamente."
					}
					isFetching={query.isFetching}
					onRetry={() => void query.refetch()}
				/>
			) : null}
			{invoices ? (
				invoices.length === 0 ? (
					<p className="py-6 text-center text-sm text-neutral-500">
						{includeRemoved ? "Sin registros de facturas" : "Sin facturas registradas"}
					</p>
				) : (
					<>
						<p className="text-xs text-neutral-500" role="status">
							{query.isFetching
								? "Actualizando facturas..."
								: `${invoices.length} ${invoices.length === 1 ? "registro" : "registros"}`}
						</p>
						<ul className="divide-y divide-neutral-100">
							{invoices.slice().reverse().map((invoice) => (
								<InvoiceListRow
									key={invoice.id}
									invoice={invoice}
									onSelect={() => onSelect(invoice.id)}
								/>
							))}
						</ul>
					</>
				)
			) : !query.error ? (
				<InvoiceLoadingState />
			) : null}
		</div>
	);
}

function InvoiceDetail({
	rentalId,
	invoiceId,
	permissions,
	onBack,
}: {
	rentalId: string;
	invoiceId: string;
	permissions: readonly TenantPermissionId[];
	onBack: () => void;
}) {
	const queryClient = useQueryClient();
	const timezone = useTenantTimezone();
	const query = useQuery(
		invoicingQueries.invoiceDetail(invoiceId, {
			permissions,
			includeRemoved: true,
		}),
	);
	const invoice = canShowQueryData(query.error) ? query.data : undefined;

	function handleBack() {
		if (getProblemDetailsStatus(query.error) === 404 || invoice?.removedAt) {
			void queryClient.invalidateQueries({
				queryKey: invoicingKeys.rentalLists(rentalId),
			});
		}
		onBack();
	}

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<div className="border-b border-neutral-100 px-4 py-3 sm:px-6">
				<Button type="button" variant="ghost" size="sm" onClick={handleBack}>
					<ArrowLeft className="size-3.5" />
					Volver a facturas
				</Button>
			</div>
			<div className="min-h-0 min-w-0 flex-1 space-y-5 overflow-y-auto px-4 py-5 sm:px-6">
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
				{invoice ? (
					<>
						<h3 className="text-base font-semibold text-neutral-950 [overflow-wrap:anywhere]">
							{invoice.reference}
						</h3>
						{query.isFetching ? (
							<p className="text-xs text-neutral-500" role="status">
								Actualizando registro...
							</p>
						) : null}
						{invoice.removedAt ? (
							<div className="space-y-1 rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm">
								<p className="font-medium text-neutral-900">Registro eliminado de Depiqo</p>
								<p className="text-neutral-600">
									Esto no indica que la factura del sistema externo haya sido
									cancelada o eliminada.
								</p>
							</div>
						) : null}
						<InvoiceRegistrationDetails invoice={invoice} />
						<dl className="grid gap-4 border-t border-neutral-100 pt-4 sm:grid-cols-2">
							<InvoiceActivity
								label="Registrada en Depiqo"
								at={invoice.createdAt}
								timezone={timezone}
							/>
							<InvoiceActivity
								label="Última actualización"
								at={invoice.updatedAt}
								timezone={timezone}
							/>
							{invoice.removedAt ? (
								<InvoiceActivity
									label="Registro eliminado"
									at={invoice.removedAt}
									timezone={timezone}
								/>
							) : null}
						</dl>
						<p className="text-xs text-neutral-500">Zona horaria: {timezone}</p>
						<InvoiceHistory history={invoice.history} timezone={timezone} />
					</>
				) : !query.error ? (
					<InvoiceLoadingState />
				) : null}
			</div>
			{can(permissions, TenantPermission.InvoicingManage) ? (
				<InvoiceActions
					invoice={invoice}
					error={query.error}
					isFetching={query.isFetching}
					onRemoved={onBack}
				/>
			) : null}
		</div>
	);
}

function InvoiceActions({
	invoice,
	error,
	isFetching,
	onRemoved,
}: {
	invoice: InvoiceDto | undefined;
	error: unknown;
	isFetching: boolean;
	onRemoved: () => void;
}) {
	const [action, setAction] = useState<{
		type: "correct" | "remove";
		invoice: InvoiceDto;
	} | null>(null);
	let blockedMessage: string | null = null;
	if (action) {
		if (error) {
			blockedMessage = toInvoicingUiError(
				error,
				"No pudimos actualizar el registro. Cerrá el diálogo e intentá cargarlo nuevamente.",
			).message;
		} else if (!invoice) {
			blockedMessage = "El registro ya no está disponible. Cerrá el diálogo y actualizá la lista.";
		} else if (invoice.removedAt) {
			blockedMessage = "El registro ya fue eliminado de Depiqo. Cerrá el diálogo para revisar la información actual.";
		} else if (invoice.version !== action.invoice.version) {
			blockedMessage = "El registro cambió. Cerrá el diálogo y revisá la información actual antes de continuar.";
		}
	}

	return (
		<>
			{invoice && !invoice.removedAt ? (
				<div className="flex flex-wrap gap-2 border-t border-neutral-200 px-4 py-4 sm:px-6">
					<Button
						type="button"
						variant="outline"
						disabled={isFetching || Boolean(error)}
						onClick={() => setAction({ type: "correct", invoice })}
					>
						<Pencil className="size-3.5" />
						Corregir registro
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={isFetching || Boolean(error)}
						onClick={() => setAction({ type: "remove", invoice })}
					>
						<Trash2 className="size-3.5" />
						Eliminar registro
					</Button>
				</div>
			) : null}
			{action?.type === "correct" ? (
				<InvoiceFormDialog
					mode="correct"
					open
					onOpenChange={(open) => !open && setAction(null)}
					invoice={action.invoice}
					blockedMessage={blockedMessage}
				/>
			) : action?.type === "remove" ? (
				<RemoveInvoiceRegistrationAlertDialog
					invoice={action.invoice}
					blockedMessage={blockedMessage}
					onClose={() => setAction(null)}
					onRemoved={onRemoved}
				/>
			) : null}
		</>
	);
}

function InvoiceRegistrationDetails({ invoice }: { invoice: InvoiceDto }) {
	return (
		<dl className="grid min-w-0 gap-4 sm:grid-cols-2">
			<InvoiceMetadataField label="Fecha de emisión">
				<time dateTime={invoice.issuedOn}>{formatInvoiceDate(invoice.issuedOn)}</time>
			</InvoiceMetadataField>
			<InvoiceMetadataField label="Importe">
				<span className="font-mono">
					{formatExactCurrencyRate(invoice.amount, invoice.currency)} {invoice.currency}
				</span>
			</InvoiceMetadataField>
			<InvoiceMetadataField label="Sistema de origen">
				{invoice.sourceSystem ?? "No indicado"}
			</InvoiceMetadataField>
			<InvoiceMetadataField label="Enlace externo">
				{invoice.externalUrl ? (
					<a
						href={invoice.externalUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
					>
						Abrir factura externa
						<ExternalLink className="size-3.5 shrink-0" />
					</a>
				) : "No indicado"}
			</InvoiceMetadataField>
		</dl>
	);
}

const historyActionLabels = {
	REGISTERED: "Registrada",
	CORRECTED: "Corregida",
	REMOVED: "Registro eliminado",
} satisfies Record<InvoiceHistoryEntryDto["action"], string>;

function InvoiceHistory({
	history,
	timezone,
}: {
	history: InvoiceHistoryEntryDto[];
	timezone: string;
}) {
	if (!history.some((entry) => entry.action === "CORRECTED" || entry.action === "REMOVED")) {
		return null;
	}

	return (
		<details className="group/history border-t border-neutral-200 pt-4">
			<summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-md font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
				Historial ({history.length})
				<ChevronDown className="size-4 shrink-0 text-neutral-400 transition-transform group-open/history:rotate-180" />
			</summary>
			<ol className="mt-4 space-y-5 border-l border-neutral-200 pl-4">
				{history.map((entry) => (
					<li key={entry.id} className="min-w-0 space-y-3">
						<dl>
							<InvoiceActivity
								label={historyActionLabels[entry.action]}
								at={entry.occurredAt}
								timezone={timezone}
							/>
						</dl>
						<details className="group/snapshot rounded-md border border-neutral-200 p-3">
							<summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
								Ver datos registrados
								<ChevronDown className="size-3.5 shrink-0 transition-transform group-open/snapshot:rotate-180" />
							</summary>
							<div className="mt-4 space-y-3">
								<p className="text-sm font-medium [overflow-wrap:anywhere]">
									{entry.snapshot.reference}
								</p>
								<InvoiceRegistrationDetails invoice={entry.snapshot} />
							</div>
						</details>
					</li>
				))}
			</ol>
		</details>
	);
}

function InvoiceActivity({
	label,
	at,
	timezone,
}: {
	label: string;
	at: string;
	timezone: string;
}) {
	return (
		<InvoiceMetadataField label={label}>
			<time dateTime={at}>
				{formatTimestampInTimezone(at, timezone, "DD/MM/YYYY HH:mm")}
			</time>
		</InvoiceMetadataField>
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
			<dd className="text-sm text-neutral-950 [overflow-wrap:anywhere]">{children}</dd>
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
		<div className="space-y-3 text-sm" role="alert">
			<p className="text-destructive">{uiError.message}</p>
			{uiError.kind === "unauthorized" ? (
				<a href="/login" className="font-medium text-primary underline underline-offset-4">
					Volver a iniciar sesión
				</a>
			) : canShowQueryData(error) ? (
				<Button type="button" variant="outline" size="sm" disabled={isFetching} onClick={onRetry}>
					{isFetching ? "Actualizando..." : "Reintentar"}
				</Button>
			) : null}
		</div>
	);
}

function InvoiceLoadingState() {
	return (
		<div className="space-y-3" aria-busy="true" aria-label="Cargando facturas">
			<Skeleton className="h-14 w-full" />
			<Skeleton className="h-14 w-full" />
		</div>
	);
}
