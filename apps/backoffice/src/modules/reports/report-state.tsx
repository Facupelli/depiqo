import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import { TableCell, TableRow } from "@repo/ui/components/table";
import { RefreshCw } from "lucide-react";

export function ReportRefreshButton({
	isFetching,
	onRefresh,
}: {
	isFetching: boolean;
	onRefresh: () => void;
}) {
	return (
		<Button
			variant="ghost"
			size="icon"
			className="size-8 shrink-0 text-muted-foreground hover:text-depiqo-blue-600 pointer-coarse:size-11"
			aria-label="Actualizar reporte"
			disabled={isFetching}
			onClick={onRefresh}
		>
			<RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
		</Button>
	);
}

export function ReportRefreshError({
	onRetry,
	isFetching,
}: {
	onRetry: () => void;
	isFetching: boolean;
}) {
	return (
		<div
			role="alert"
			className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900"
		>
			<p>
				No pudimos actualizar el reporte. Se muestra la última información
				disponible.
			</p>
			<Button
				variant="outline"
				size="sm"
				disabled={isFetching}
				onClick={onRetry}
			>
				Reintentar
			</Button>
		</div>
	);
}

export function ReportTableSkeleton({ columns }: { columns: number }) {
	const slots = Array.from(
		{ length: columns },
		(_, index) => `column-${index}`,
	);
	return ["first", "second", "third", "fourth", "fifth", "sixth"].map((row) => (
		<TableRow key={row} aria-hidden="true">
			{slots.map((column) => (
				<TableCell key={column} className="h-14">
					<Skeleton className="h-4 w-3/4" />
				</TableCell>
			))}
		</TableRow>
	));
}
