import type { LocalDate } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { currentAuthQueries } from "@/auth/auth.queries";
import dayjs from "@/lib/dates/dayjs";
import { branchQueries } from "@/modules/settings/branches/public";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { useRentalOperations } from "./rental-operations.queries";
import { RentalOperationsPeriodPicker } from "./rental-operations-period-picker";
import { RentalOperationsSection } from "./rental-operations-section";

export type RentalOperationsSearch = {
	from?: LocalDate;
	to?: LocalDate;
};

type RentalOperationsDashboardPageProps = {
	search: RentalOperationsSearch;
	onPeriodChange: (from: LocalDate, to: LocalDate) => void;
};

export function RentalOperationsDashboardPage({
	search,
	onPeriodChange,
}: RentalOperationsDashboardPageProps) {
	const { data: currentAuth } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches } = useSuspenseQuery(branchQueries.list());
	const branchId =
		branches.length === 1 ? branches[0].id : currentAuth.workingBranchId;
	const timezone = useBranchTimezone(branchId);
	const today = dayjs().tz(timezone).format("YYYY-MM-DD");
	const from = search.from ?? today;
	const to = search.to ?? today;
	const operationsQuery = useRentalOperations(
		branchId ? { branchId, from, to } : undefined,
	);
	const data = operationsQuery.data;
	const isInitialLoading = operationsQuery.isPending && !data;
	const isInitialError = operationsQuery.isError && !data;

	return (
		<div className="@container/rental-operations space-y-4">
			<header className="flex flex-col gap-3 @md/rental-operations:flex-row @md/rental-operations:items-center @md/rental-operations:justify-between">
				<h1 className="text-xl font-semibold tracking-tight text-foreground">
					Inicio
				</h1>
				<RentalOperationsPeriodPicker
					from={from}
					to={to}
					today={today}
					onChange={onPeriodChange}
				/>
			</header>

			{!branchId ? (
				<div className="flex min-h-64 items-center justify-center rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
					Selecciona una sucursal para ver las operaciones.
				</div>
			) : isInitialError ? (
				<div className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-lg border border-dashed px-4 py-10 text-center">
					<p className="text-sm text-muted-foreground">
						No pudimos cargar las operaciones.
					</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => operationsQuery.refetch()}
						disabled={operationsQuery.isFetching}
					>
						{operationsQuery.isFetching ? "Reintentando..." : "Reintentar"}
					</Button>
				</div>
			) : (
				<div className="space-y-2">
					<div
						className={`flex min-h-5 items-center justify-end gap-1.5 text-xs text-muted-foreground ${
							operationsQuery.isFetching && data ? "visible" : "invisible"
						}`}
						aria-live="polite"
					>
						<Loader2 className="size-3 animate-spin" />
						Actualizando...
					</div>
					<div className="grid gap-4 @3xl/rental-operations:grid-cols-2">
						<RentalOperationsSection
							title="Salidas"
							operations={data?.goingOut ?? []}
							emptyMessage="No hay salidas en este período."
							timezone={timezone}
							isSingleDay={from === to}
							isLoading={isInitialLoading}
						/>
						<RentalOperationsSection
							title="Devoluciones"
							operations={data?.comingBack ?? []}
							emptyMessage="No hay devoluciones en este período."
							timezone={timezone}
							isSingleDay={from === to}
							isLoading={isInitialLoading}
						/>
					</div>
				</div>
			)}
		</div>
	);
}
