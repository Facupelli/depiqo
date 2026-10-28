import {
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, FileText, Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { can } from "@/auth/permissions";
import { formatExactCurrencyRate } from "@/shared/utils/formatters";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { formatInvoiceDate } from "./invoice.utils";
import { toInvoicingUiError } from "./invoicing.errors";
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
	const registrationControl = canManage ? (
		props.registrationEligible ? (
			<Button
				type="button"
				variant="outline"
				size="sm"
				className="w-full"
				onClick={() => setRegistrationOpen(true)}
			>
				<Plus className="size-3.5" />
				Registrar factura
			</Button>
		) : (
			<p className="text-xs text-neutral-500">
				Podés registrar facturas para alquileres confirmados, completados o
				cancelados después de su confirmación.
			</p>
		)
	) : null;

	return (
		<>
			{canRead ? (
				<ReadableRentalInvoicesCard
					rentalId={props.rentalId}
					permissions={props.permissions}
					registrationControl={registrationControl}
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
				</InvoiceCard>
			)}
			{canManage ? (
				<InvoiceFormDialog
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
}: {
	rentalId: string;
	permissions: readonly TenantPermissionId[];
	registrationControl: ReactNode;
}) {
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
	const hideData =
		uiError?.kind === "unauthorized" ||
		uiError?.kind === "forbidden" ||
		uiError?.kind === "rental-not-found";
	const invoices = hideData ? undefined : query.data;
	const summary = uiError
		? uiError.message
		: invoices
			? invoices.length === 0
				? "Sin facturas registradas"
				: `${invoices.length} ${invoices.length === 1 ? "factura registrada" : "facturas registradas"}`
			: "Cargando facturas...";
	const hideRegistration =
		uiError?.kind === "unauthorized" ||
		uiError?.kind === "rental-not-found";

	return (
		<InvoiceCard
			summary={summary}
			registrationControl={hideRegistration ? null : registrationControl}
		>
			{uiError ? (
				<div className="space-y-2 text-sm" role="alert">
					<p className="text-destructive">{uiError.message}</p>
					{uiError.kind === "unauthorized" ? (
						<a
							href="/login"
							className="font-medium text-primary underline underline-offset-4"
						>
							Volver a iniciar sesión
						</a>
					) : uiError.kind !== "forbidden" &&
						uiError.kind !== "rental-not-found" ? (
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={query.isFetching}
							onClick={() => void query.refetch()}
						>
							{query.isFetching ? "Actualizando..." : "Reintentar"}
						</Button>
					) : null}
				</div>
			) : null}

			{invoices ? (
				invoices.length === 0 ? (
					<p className="text-sm text-neutral-500">Sin facturas registradas</p>
				) : (
					<div className="space-y-2">
						<ul className="divide-y divide-neutral-100">
							{invoices.slice(-2).reverse().map((invoice) => (
								<li key={invoice.id} className="min-w-0 space-y-1.5 py-2 first:pt-0 last:pb-0">
									<div className="flex min-w-0 items-start justify-between gap-2">
										<p
											className="min-w-0 line-clamp-2 text-sm font-medium text-neutral-950 [overflow-wrap:anywhere]"
											title={invoice.reference}
										>
											{invoice.reference}
										</p>
										{invoice.externalUrl ? (
											<a
												href={invoice.externalUrl}
												target="_blank"
												rel="noopener noreferrer"
												aria-label={`Abrir factura ${invoice.reference} en el sistema externo`}
												className="flex size-7 shrink-0 items-center justify-center rounded-md text-primary hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											>
												<ExternalLink className="size-3.5" />
											</a>
										) : null}
									</div>
									<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
										<time dateTime={invoice.issuedOn} className="text-xs text-neutral-500">
											{formatInvoiceDate(invoice.issuedOn)}
										</time>
										<p className="min-w-0 break-words font-mono text-sm text-neutral-950">
											{formatExactCurrencyRate(invoice.amount, invoice.currency)}{" "}
											<span className="text-xs text-neutral-500">{invoice.currency}</span>
										</p>
									</div>
								</li>
							))}
						</ul>
						{invoices.length > 2 ? (
							<p className="text-xs text-neutral-500">
								Mostrando las 2 más recientes de {invoices.length} facturas.
							</p>
						) : null}
					</div>
				)
			) : !uiError ? (
				<div className="space-y-2" aria-busy="true" aria-label="Cargando facturas">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}
		</InvoiceCard>
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
			<button
				type="button"
				className="flex w-full min-w-0 items-start justify-between gap-3 text-left @5xl/rental-detail:hidden"
				onClick={() => setIsExpanded((previous) => !previous)}
				aria-expanded={isExpanded}
				aria-controls={contentId}
			>
				<span className="min-w-0">
					<span className="block text-sm font-bold text-neutral-950">Facturas</span>
					<span className="mt-0.5 block break-words text-sm text-neutral-600">
						{summary}
					</span>
				</span>
				<ChevronDown
					className={`size-4 shrink-0 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
				/>
			</button>
			<div className="mb-2 hidden items-center gap-2 border-b border-neutral-100 pb-2 @5xl/rental-detail:flex">
				<span className="flex size-6 items-center justify-center text-neutral-600">
					<FileText className="size-4" />
				</span>
				<h2 className="text-sm font-bold text-neutral-950">Facturas</h2>
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
			{registrationControl ? <div className="mt-3">{registrationControl}</div> : null}
		</section>
	);
}
