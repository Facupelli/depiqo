import {
	type InvoiceDto,
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
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileText, Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { can } from "@/auth/permissions";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { InvoiceListRow, type InvoiceRowAction } from "./invoice-list-row";
import { InvoiceRecordDialog } from "./invoice-record-dialog";
import { type InvoicingUiError, toInvoicingUiError } from "./invoicing.errors";
import { invoicingQueries } from "./invoicing.queries";

type RentalInvoicesCardProps = {
	rentalId: string;
	permissions: readonly TenantPermissionId[];
	acceptedCustomerTotal: string | null;
	currency: string | null;
	registrationEligible: boolean;
	onRentalContextStale: () => Promise<void>;
};

export function RentalInvoicesCard(props: RentalInvoicesCardProps) {
	const canRead = can(props.permissions, TenantPermission.InvoicingRead);
	const canManage = can(props.permissions, TenantPermission.InvoicingManage);
	if (!canRead && !canManage) return null;

	return <AvailableRentalInvoicesCard key={props.rentalId} {...props} />;
}

function AvailableRentalInvoicesCard(props: RentalInvoicesCardProps) {
	const [registrationOpen, setRegistrationOpen] = useState(false);
	const canRead = can(props.permissions, TenantPermission.InvoicingRead);
	const canManage = can(props.permissions, TenantPermission.InvoicingManage);
	const registrationControl =
		canManage && props.registrationEligible ? (
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="h-7 shrink-0 px-2 text-xs"
				onClick={() => setRegistrationOpen(true)}
			>
				<Plus className="size-3.5" />
				Registrar
			</Button>
		) : null;
	const registrationHint =
		canManage && !props.registrationEligible ? (
			<p className="text-xs text-neutral-500">
				Podés registrar facturas para alquileres confirmados, completados o
				cancelados después de su confirmación.
			</p>
		) : null;

	return (
		<>
			{canRead ? (
				<ReadableRentalInvoicesCard
					rentalId={props.rentalId}
					permissions={props.permissions}
					registrationControl={registrationControl}
					registrationHint={registrationHint}
				/>
			) : (
				<InvoiceCard
					summary="Sin permiso de consulta"
					registrationControl={registrationControl}
				>
					<p className="text-sm text-neutral-500">
						Podés registrar facturas, pero no tenés permiso para consultar las
						registradas.
					</p>
					{registrationHint}
				</InvoiceCard>
			)}
			{canManage ? (
				<InvoiceFormDialog
					mode="register"
					open={registrationOpen}
					onOpenChange={setRegistrationOpen}
					rentalId={props.rentalId}
					acceptedCustomerTotal={props.acceptedCustomerTotal}
					currency={props.currency}
					registrationEligible={props.registrationEligible}
					onRentalContextStale={props.onRentalContextStale}
				/>
			) : null}
		</>
	);
}

function ReadableRentalInvoicesCard({
	rentalId,
	permissions,
	registrationControl,
	registrationHint,
}: {
	rentalId: string;
	permissions: readonly TenantPermissionId[];
	registrationControl: ReactNode;
	registrationHint: ReactNode;
}) {
	const [allInvoicesOpen, setAllInvoicesOpen] = useState(false);
	const [action, setAction] = useState<{
		invoice: InvoiceDto;
		type: InvoiceRowAction;
	} | null>(null);
	const canManage = can(permissions, TenantPermission.InvoicingManage);
	const query = useQuery(
		invoicingQueries.rentalList(rentalId, { permissions }),
	);
	const uiError = query.error
		? toInvoicingUiError(
				query.error,
				query.data
					? "No pudimos actualizar las facturas. La información mostrada puede estar desactualizada."
					: "No pudimos cargar las facturas. Revisá tu conexión e intentá nuevamente.",
			)
		: null;
	const hideData = shouldHideInvoices(uiError);
	const invoices = hideData ? undefined : query.data;
	const summary = uiError
		? uiError.message
		: invoices
			? invoices.length === 0
				? "Sin facturas registradas"
				: `${invoices.length} ${invoices.length === 1 ? "factura registrada" : "facturas registradas"}`
			: "Cargando facturas...";
	const hideRegistration =
		uiError?.kind === "unauthorized" || uiError?.kind === "rental-not-found";

	function handleAction(invoice: InvoiceDto, type: InvoiceRowAction) {
		setAction({ invoice, type });
	}

	const recordDialog =
		action && !hideData ? (
			<InvoiceRecordDialog
				key={`${action.type}:${action.invoice.id}`}
				invoice={action.invoice}
				action={action.type}
				permissions={permissions}
				onClose={() => setAction(null)}
			/>
		) : null;

	return (
		<InvoiceCard
			summary={summary}
			registrationControl={hideRegistration ? null : registrationControl}
		>
			{uiError ? (
				<InvoiceListError
					error={uiError}
					isFetching={query.isFetching}
					onRetry={() => void query.refetch()}
				/>
			) : null}
			{invoices ? (
				invoices.length === 0 ? (
					<p className="text-sm text-neutral-500">Sin facturas registradas</p>
				) : (
					<ul className="divide-y divide-neutral-100">
						{invoices
							.slice(-3)
							.reverse()
							.map((invoice) => (
								<InvoiceListRow
									key={invoice.id}
									invoice={invoice}
									canManage={canManage}
									mutationDisabled={query.isFetching || Boolean(query.error)}
									onAction={handleAction}
								/>
							))}
					</ul>
				)
			) : !uiError ? (
				<InvoiceListLoadingState />
			) : null}
			{invoices && invoices.length > 3 ? (
				<Button
					type="button"
					variant="link"
					size="sm"
					className="h-auto px-0 text-xs"
					onClick={() => setAllInvoicesOpen(true)}
				>
					Ver todas ({invoices.length})
				</Button>
			) : null}
			{registrationHint}
			{allInvoicesOpen && !hideData ? (
				<InvoiceListDialog
					rentalId={rentalId}
					permissions={permissions}
					onAction={handleAction}
					onClose={() => !action && setAllInvoicesOpen(false)}
				>
					{recordDialog}
				</InvoiceListDialog>
			) : (
				recordDialog
			)}
		</InvoiceCard>
	);
}

function InvoiceListDialog({
	rentalId,
	permissions,
	onAction,
	onClose,
	children,
}: {
	rentalId: string;
	permissions: readonly TenantPermissionId[];
	onAction: (invoice: InvoiceDto, action: InvoiceRowAction) => void;
	onClose: () => void;
	children: ReactNode;
}) {
	const query = useQuery(
		invoicingQueries.rentalList(rentalId, { permissions }),
	);
	const uiError = query.error
		? toInvoicingUiError(
				query.error,
				query.data
					? "No pudimos actualizar la lista. La información mostrada puede estar desactualizada."
					: "No pudimos cargar las facturas. Revisá tu conexión e intentá nuevamente.",
			)
		: null;
	const invoices = shouldHideInvoices(uiError) ? undefined : query.data;

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
				<DialogHeader className="pr-6">
					<DialogTitle>Facturas</DialogTitle>
					<DialogDescription>
						Facturas emitidas fuera de Depiqo y registradas en este alquiler.
					</DialogDescription>
				</DialogHeader>
				{uiError ? (
					<InvoiceListError
						error={uiError}
						isFetching={query.isFetching}
						onRetry={() => void query.refetch()}
					/>
				) : null}
				{invoices ? (
					invoices.length === 0 ? (
						<p className="text-sm text-neutral-500">Sin facturas registradas</p>
					) : (
						<ul className="divide-y divide-neutral-100">
							{invoices
								.slice()
								.reverse()
								.map((invoice) => (
									<InvoiceListRow
										key={invoice.id}
										invoice={invoice}
										canManage={can(
											permissions,
											TenantPermission.InvoicingManage,
										)}
										mutationDisabled={query.isFetching || Boolean(query.error)}
										onAction={onAction}
									/>
								))}
						</ul>
					)
				) : !uiError ? (
					<InvoiceListLoadingState />
				) : null}
			</DialogContent>
			{children}
		</Dialog>
	);
}

function shouldHideInvoices(error: InvoicingUiError | null): boolean {
	return (
		error?.kind === "unauthorized" ||
		error?.kind === "forbidden" ||
		error?.kind === "rental-not-found"
	);
}

function InvoiceListError({
	error,
	isFetching,
	onRetry,
}: {
	error: InvoicingUiError;
	isFetching: boolean;
	onRetry: () => void;
}) {
	return (
		<div className="space-y-2 text-sm" role="alert">
			<p className="text-destructive">{error.message}</p>
			{error.kind === "unauthorized" ? (
				<a
					href="/login"
					className="font-medium text-primary underline underline-offset-4"
				>
					Volver a iniciar sesión
				</a>
			) : !shouldHideInvoices(error) ? (
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

function InvoiceListLoadingState() {
	return (
		<section
			className="space-y-2"
			aria-busy="true"
			aria-label="Cargando facturas"
		>
			<Skeleton className="h-10 w-full" />
			<Skeleton className="h-10 w-full" />
		</section>
	);
}

function InvoiceCard({
	summary,
	registrationControl,
	children,
}: {
	summary: string;
	registrationControl: ReactNode;
	children: ReactNode;
}) {
	const [isExpanded, setIsExpanded] = useState(false);
	const contentId = useId();

	return (
		<section className="rounded-lg border border-neutral-200 bg-white p-4">
			<div className="flex min-w-0 items-center gap-2 @5xl/rental-detail:mb-3 @5xl/rental-detail:border-b @5xl/rental-detail:border-neutral-100 @5xl/rental-detail:pb-2">
				<span className="hidden size-6 items-center justify-center text-neutral-600 @5xl/rental-detail:flex">
					<FileText className="size-4" />
				</span>
				<h2 className="hidden min-w-0 flex-1 text-sm font-bold text-neutral-950 @5xl/rental-detail:block">
					Facturas
				</h2>
				<button
					type="button"
					className="min-w-0 flex-1 rounded-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @5xl/rental-detail:hidden"
					onClick={() => setIsExpanded((previous) => !previous)}
					aria-expanded={isExpanded}
					aria-controls={contentId}
				>
					<span className="block text-sm font-bold text-neutral-950">
						Facturas
					</span>
					<span className="mt-0.5 block break-words text-sm text-neutral-600">
						{summary}
					</span>
				</button>
				{registrationControl}
				<button
					type="button"
					className="flex size-8 shrink-0 items-center justify-center rounded-md text-neutral-400 hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring @5xl/rental-detail:hidden"
					onClick={() => setIsExpanded((previous) => !previous)}
					aria-expanded={isExpanded}
					aria-controls={contentId}
					aria-label={`${isExpanded ? "Contraer" : "Expandir"} Facturas`}
				>
					<ChevronDown
						className={`size-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
					/>
				</button>
			</div>
			<div
				id={contentId}
				className={
					isExpanded
						? "mt-4 space-y-3 @5xl/rental-detail:mt-0"
						: "hidden space-y-3 @5xl/rental-detail:block"
				}
			>
				{children}
			</div>
		</section>
	);
}
