import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { AlertCircle } from "lucide-react";
import { AdminRouteError } from "@/shared/components/admin-route-error";
import { isForbiddenError } from "@/shared/errors";
import { getFinancialReportErrorMessage } from "./rental-financial-report.errors";

export function RentalFinancialReportError({
	error,
	onRetry,
	isRetrying = false,
}: {
	error: unknown;
	onRetry: () => void;
	isRetrying?: boolean;
}) {
	if (isForbiddenError(error)) {
		return (
			<AdminRouteError
				error={error}
				forbiddenMessage={getFinancialReportErrorMessage(error)}
			/>
		);
	}
	return (
		<div
			role="alert"
			className="flex min-h-64 flex-col items-center justify-center gap-4 rounded-lg border bg-card p-6 text-center"
		>
			<AlertCircle className="size-6 text-muted-foreground" />
			<div className="max-w-lg space-y-2">
				<h2 className="font-semibold">No se pudo generar el reporte</h2>
				<p className="text-sm leading-relaxed text-muted-foreground">
					{getFinancialReportErrorMessage(error)}
				</p>
			</div>
			<Button variant="outline" onClick={onRetry} disabled={isRetrying}>
				{isRetrying ? "Reintentando..." : "Reintentar"}
			</Button>
		</div>
	);
}

export function RentalFinancialReportSkeleton() {
	return (
		<div
			aria-busy="true"
			className="@container/financial-report-loading space-y-4"
		>
			<output className="sr-only">Cargando reporte financiero</output>
			<div className="grid gap-4 @2xl/financial-report-loading:grid-cols-3">
				{["total", "third-party", "retained"].map((key) => (
					<div
						key={key}
						className="flex items-center justify-between gap-4 rounded-lg border bg-card p-4 @2xl/financial-report-loading:block @2xl/financial-report-loading:space-y-4 @2xl/financial-report-loading:p-5"
					>
						<div className="flex items-center gap-3">
							<Skeleton className="size-8 rounded-lg @2xl/financial-report-loading:size-9" />
							<Skeleton className="h-4 w-20" />
						</div>
						<Skeleton className="h-8 w-24 @2xl/financial-report-loading:h-10 @2xl/financial-report-loading:w-32" />
					</div>
				))}
			</div>
			<div className="grid gap-4 @2xl/financial-report-loading:grid-cols-2">
				<Skeleton className="h-80 w-full rounded-lg" />
				<Skeleton className="h-80 w-full rounded-lg" />
			</div>
			<Skeleton className="h-96 w-full rounded-lg" />
		</div>
	);
}
