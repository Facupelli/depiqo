import type { GetRentalsSortByDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Link } from "@tanstack/react-router";
import type { Dayjs } from "dayjs";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useEffect, useState } from "react";
import dayjs from "@/lib/dates/dayjs";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { cn } from "@/lib/utils";
import type { ParsedRentalListItem } from "@/modules/rentals/rental.queries";
import { getFulfillmentMethodLabel } from "@/modules/rentals/shared/fulfillment-method";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { formatOrderNumber } from "@/shared/utils/formatters";
import {
	getNextRentalSortDirection,
	getRentalListDate,
	getRentalListStatus,
} from "../rental-orders-presentation";
import {
	getEffectiveRentalOrdersSort,
	useRentalOrdersList,
} from "./rental-orders-list.context";
import { RentalOrdersPagination } from "./rental-orders-pagination";

const dateColumns = [
	{ sortBy: "pickupDate", label: "Retira", endpoint: "pickupAt" },
	{ sortBy: "returnDate", label: "Devuelve", endpoint: "returnAt" },
] as const;

export function RentalOrdersTable() {
	const {
		rentals,
		meta,
		search,
		effectiveRequest,
		isLoading,
		isRefreshing,
		isError,
		retry,
		getBranchName,
		getOperationalTimezone,
	} = useRentalOrdersList();
	const tenantTimezone = useTenantTimezone();
	const [now, setNow] = useState(() => dayjs());
	useEffect(() => {
		const timer = setInterval(() => setNow(dayjs()), 60_000);
		return () => clearInterval(timer);
	}, []);
	const loading = isLoading;
	const showBranch = effectiveRequest.branchId === undefined;
	const emptyMessage =
		meta.total > 0
			? "Esta página ya no tiene resultados. Seleccioná otra página."
			: "No hay alquileres para los filtros seleccionados.";

	return (
		<section
			aria-label="Listado de alquileres"
			aria-busy={loading || isRefreshing}
			className="min-w-0 overflow-hidden rounded-lg border border-border bg-card text-card-foreground"
		>
			{isError ? (
				<div
					role="alert"
					className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 text-sm"
				>
					<p>
						{rentals.length > 0
							? "No pudimos actualizar los alquileres. Se muestran los últimos datos disponibles."
							: "No pudimos cargar los alquileres."}
					</p>
					<Button
						variant="outline"
						size="sm"
						className="shadow-none"
						onClick={retry}
						disabled={loading || isRefreshing}
					>
						Reintentar
					</Button>
				</div>
			) : null}
			<div className="hidden @4xl/rentals-index:block">
				<Table
					aria-label="Alquileres"
					className="table-fixed text-foreground [&_td]:px-4 [&_td]:py-3 [&_th]:h-11 [&_th]:px-4 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground"
				>
					<TableHeader className="bg-muted/40">
						<TableRow className="hover:bg-transparent">
							<TableHead scope="col" className="w-[22%]">
								Alquiler / Cliente
							</TableHead>
							<TableHead scope="col" className="w-[16%]">
								Estado
							</TableHead>
							<TableHead scope="col" className="w-[14%] whitespace-normal">
								Modalidad{showBranch ? " / Sucursal" : ""}
							</TableHead>
							{dateColumns.map((column) => (
								<RentalSortHead
									key={column.sortBy}
									sortBy={column.sortBy}
									label={column.label}
									className="w-[18%]"
								/>
							))}
							<RentalSortHead
								sortBy="createdAt"
								label="Creado"
								className="w-[12%]"
							/>
						</TableRow>
					</TableHeader>
					<TableBody className="[&_tr:nth-child(even)]:bg-muted/20">
						{loading ? (
							Array.from({ length: Math.min(search.limit, 10) }, (_, index) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static loading placeholders
								<TableRow key={index} aria-hidden="true">
									{Array.from({ length: 6 }, (_, cell) => (
										// biome-ignore lint/suspicious/noArrayIndexKey: static loading placeholders
										<TableCell key={cell}>
											<Skeleton className="my-2 h-8 w-full" />
										</TableCell>
									))}
								</TableRow>
							))
						) : rentals.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={6}
									className="h-40 whitespace-normal text-center text-sm text-muted-foreground"
								>
									{isError
										? "Intentá cargar el listado nuevamente."
										: emptyMessage}
								</TableCell>
							</TableRow>
						) : (
							rentals.map((rental) => (
								<TableRow key={rental.id}>
									<TableCell className="whitespace-normal">
										<RentalIdentity rental={rental} />
									</TableCell>
									<TableCell className="whitespace-normal">
										<RentalStatus rental={rental} now={now} />
									</TableCell>
									<TableCell className="whitespace-normal">
										<div className="space-y-1">
											<p>
												{getFulfillmentMethodLabel(rental.fulfillmentMethod)}
											</p>
											{showBranch ? (
												<p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
													{getBranchName(rental.branchId) ??
														"Sucursal no disponible"}
												</p>
											) : null}
										</div>
									</TableCell>
									{dateColumns.map((column) => (
										<TableCell key={column.endpoint}>
											<RentalDate
												rental={rental}
												endpoint={column.endpoint}
												timezone={getOperationalTimezone(rental.branchId)}
												now={now}
											/>
										</TableCell>
									))}
									<TableCell>
										<time
											dateTime={rental.createdAt.toISOString()}
											title={`${formatTimestampInTimezone(rental.createdAt, tenantTimezone, "D MMM YYYY · HH:mm")} (${tenantTimezone})`}
											className="text-xs text-muted-foreground tabular-nums"
										>
											{formatTimestampInTimezone(
												rental.createdAt,
												tenantTimezone,
												"D MMM YYYY",
											)}
										</time>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
			<div className="@4xl/rentals-index:hidden">
				{loading ? (
					<div className="divide-y" aria-hidden="true">
						{Array.from({ length: Math.min(search.limit, 5) }, (_, index) => (
							// biome-ignore lint/suspicious/noArrayIndexKey: static loading placeholders
							<div key={index} className="space-y-3 p-4">
								<Skeleton className="h-5 w-2/3" />
								<Skeleton className="h-4 w-1/2" />
								<Skeleton className="h-12 w-full" />
							</div>
						))}
					</div>
				) : rentals.length === 0 ? (
					<p className="px-4 py-12 text-center text-sm text-muted-foreground">
						{isError ? "Intentá cargar el listado nuevamente." : emptyMessage}
					</p>
				) : (
					<ul className="divide-y">
						{rentals.map((rental) => (
							<li
								key={rental.id}
								className="min-w-0 space-y-3 p-4 even:bg-muted/20"
							>
								<div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
									<div className="min-w-0 flex-1">
										<RentalIdentity rental={rental} />
									</div>
									<RentalStatus rental={rental} now={now} />
								</div>
								<p className="text-xs text-muted-foreground [overflow-wrap:anywhere]">
									{getFulfillmentMethodLabel(rental.fulfillmentMethod)}
									{showBranch
										? ` · ${getBranchName(rental.branchId) ?? "Sucursal no disponible"}`
										: ""}
								</p>
								<dl className="grid grid-cols-1 gap-3 @xs/rentals-index:grid-cols-2">
									{dateColumns.map((column) => (
										<div key={column.endpoint} className="min-w-0 space-y-1">
											<dt className="text-xs text-muted-foreground">
												{column.label}{" "}
												<span className="sr-only">(programado)</span>
											</dt>
											<dd>
												<RentalDate
													rental={rental}
													endpoint={column.endpoint}
													timezone={getOperationalTimezone(rental.branchId)}
													now={now}
												/>
											</dd>
										</div>
									))}
								</dl>
							</li>
						))}
					</ul>
				)}
			</div>
			<RentalOrdersPagination />
		</section>
	);
}

function RentalIdentity({ rental }: { rental: ParsedRentalListItem }) {
	return (
		<div className="min-w-0 space-y-0.5">
			<Link
				to="/dashboard/orders/$orderId"
				params={{ orderId: rental.id }}
				preload={false}
				className="inline-flex min-h-5 items-center rounded-sm font-semibold text-depiqo-blue-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-depiqo-blue-600 pointer-coarse:min-h-11"
			>
				{formatOrderNumber(rental.rentalNumber)}
			</Link>
			<p
				className="text-xs leading-relaxed text-muted-foreground [overflow-wrap:anywhere]"
				title={rental.customer?.displayName}
			>
				{rental.customer?.displayName ?? "Sin cliente"}
			</p>
		</div>
	);
}

function RentalStatus({
	rental,
	now,
}: {
	rental: ParsedRentalListItem;
	now: Dayjs;
}) {
	const presentation = getRentalListStatus(rental, now);
	const derived =
		presentation.status === "IN_PROGRESS" || presentation.status === "FINISHED";
	return (
		<span
			className={cn(
				"inline-flex max-w-full rounded-md px-2 py-1 text-xs font-medium",
				presentation.badgeClassName,
				"border border-current/15 ring-0",
			)}
			title={
				derived
					? "Estado guardado: Confirmado. Período según las fechas programadas; no acredita retiro ni devolución."
					: undefined
			}
		>
			{presentation.label}
			{derived ? (
				<span className="sr-only">
					. Estado guardado: Confirmado. Según fechas programadas, no acredita
					retiro ni devolución.
				</span>
			) : null}
		</span>
	);
}

function RentalDate({
	rental,
	endpoint,
	timezone,
	now,
}: {
	rental: ParsedRentalListItem;
	endpoint: "pickupAt" | "returnAt";
	timezone: string;
	now: Dayjs;
}) {
	const date = getRentalListDate(rental, endpoint, timezone, now);
	return (
		<div className="space-y-1" title={`Fecha programada (${timezone})`}>
			<time
				dateTime={rental[endpoint].toISOString()}
				className={cn(
					"block text-xs tabular-nums @5xl/rentals-index:text-sm",
					date.isRelevant && "font-semibold",
				)}
			>
				{date.formatted}
			</time>
			<p className={cn("text-xs", date.relativeClassName)}>
				{date.relativeLabel}
			</p>
		</div>
	);
}

function RentalSortHead({
	sortBy,
	label,
	className,
}: {
	sortBy: GetRentalsSortByDto;
	label: string;
	className: string;
}) {
	const { search, setSort } = useRentalOrdersList();
	const current = getEffectiveRentalOrdersSort(search);
	const active = current.sortBy === sortBy;
	const Icon = active
		? current.sortDirection === "asc"
			? ArrowUp
			: ArrowDown
		: ArrowUpDown;
	return (
		<TableHead
			scope="col"
			className={className}
			aria-sort={
				active
					? current.sortDirection === "asc"
						? "ascending"
						: "descending"
					: "none"
			}
		>
			<Button
				variant="ghost"
				size="sm"
				className="-ml-2 h-8 gap-1.5 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
				aria-label={`Ordenar por ${label.toLowerCase()} ${getNextRentalSortDirection(current, sortBy) === "asc" ? "ascendente" : "descendente"}`}
				onClick={() =>
					setSort(sortBy, getNextRentalSortDirection(current, sortBy))
				}
			>
				{label}
				<Icon className="size-3.5" />
			</Button>
		</TableHead>
	);
}
