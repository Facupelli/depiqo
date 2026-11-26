import { addDaysToLocalDate } from "@repo/temporal";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	keepPreviousData,
	useQuery,
	useSuspenseQuery,
} from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { currentAuthQueries } from "@/auth/auth.queries";
import { EquipmentWorkspaceHeader } from "@/components/equipment-workspace-header";
import { branchQueries } from "@/modules/settings/branches/public";
import { useBranchTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { unitAvailabilityQuery } from "./unit-availability.queries";
import {
	firstTimelineDate,
	formatTimelineDate,
	getBranchToday,
	getTimelineWeek,
	isTimelineDate,
	lastTimelineDate,
	type TimelineWeek,
} from "./unit-availability.utils";
import {
	type TimelineSelection,
	UnitAvailabilityFilters,
} from "./unit-availability-filters";
import {
	UnitAvailabilityGrid,
	UnitAvailabilityLegend,
} from "./unit-availability-grid";
import { UnitAvailabilityPagination } from "./unit-availability-pagination";

type AvailabilityNavigation = {
	date?: string;
	onDateChange: (date?: string) => void;
};

export function UnitAvailabilityPage({
	branchId,
	canReadRentals,
	onBranchChange,
	...navigation
}: AvailabilityNavigation & {
	branchId?: string;
	canReadRentals: boolean;
	onBranchChange: (branchId: string) => void;
}) {
	const branchLabelId = useId();
	const { data: user } = useSuspenseQuery(currentAuthQueries.current());
	const { data: branches } = useSuspenseQuery(branchQueries.list());
	const branch =
		branches.length === 1
			? branches[0]
			: branches.find(({ id }) => id === (branchId ?? user.workingBranchId));
	const branchItems = branches.map(({ id, name }) => ({
		value: id,
		label: name,
	}));

	return (
		<div className="space-y-5">
			<EquipmentWorkspaceHeader current="Disponibilidad de unidades" />
			{branches.length > 0 && (
				<div className="flex flex-wrap items-center gap-2.5">
					<span id={branchLabelId} className="text-sm font-medium">
						Sucursal
					</span>
					{branches.length === 1 ? (
						<span className="text-sm text-neutral-700">{branch?.name}</span>
					) : (
						<Select
							value={branch?.id ?? null}
							items={branchItems}
							onValueChange={(value) => {
								if (value) onBranchChange(value);
							}}
						>
							<SelectTrigger
								aria-labelledby={branchLabelId}
								className="w-64 max-w-full bg-white"
							>
								<SelectValue placeholder="Selecciona una sucursal" />
							</SelectTrigger>
							<SelectContent>
								{branchItems.map(({ value, label }) => (
									<SelectItem key={value} value={value}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					)}
				</div>
			)}
			{branch ? (
				<BranchAvailability
					key={branch.id}
					branchId={branch.id}
					canReadRentals={canReadRentals}
					{...navigation}
				/>
			) : (
				<div className="rounded-lg border border-dashed px-4 py-14 text-center text-sm text-neutral-600">
					{branches.length
						? "Selecciona una sucursal para comparar sus unidades."
						: "No hay sucursales para consultar."}
				</div>
			)}
		</div>
	);
}

function BranchAvailability({
	branchId,
	canReadRentals,
	date,
	onDateChange,
}: AvailabilityNavigation & { branchId: string; canReadRentals: boolean }) {
	const timezone = useBranchTimezone(branchId);
	const today = getBranchToday(timezone);
	const anchorDate = date ?? today;
	const week = getTimelineWeek(anchorDate);
	const previousWeek = addDaysToLocalDate(week.from, -7);
	const nextWeek = addDaysToLocalDate(week.from, 7);
	const [selection, setSelection] = useState<TimelineSelection>({
		types: [],
		units: [],
	});
	const selectionKey = JSON.stringify([
		week.from,
		canReadRentals,
		selection.types.map(({ id }) => id),
		selection.units.map(({ id }) => id),
	]);

	return (
		<>
			<UnitAvailabilityFilters
				branchId={branchId}
				selection={selection}
				onChange={setSelection}
			/>
			<section aria-label="Semana de disponibilidad" className="space-y-3">
				<div className="flex flex-wrap items-center justify-between gap-3">
					<h2 className="text-base font-semibold">
						{formatTimelineDate(week.from, "D MMM")} al{" "}
						{formatTimelineDate(week.to, "D MMM YYYY")}
					</h2>
					<div className="flex flex-wrap items-center gap-2">
						<Button
							type="button"
							size="sm"
							variant="outline"
							onClick={() => onDateChange(undefined)}
						>
							Hoy
						</Button>
						<div className="flex items-center gap-1">
							<Button
								type="button"
								size="icon-sm"
								variant="outline"
								aria-label="Semana anterior"
								disabled={!isTimelineDate(previousWeek)}
								onClick={() => onDateChange(previousWeek)}
							>
								<ChevronLeft />
							</Button>
							<Button
								type="button"
								size="icon-sm"
								variant="outline"
								aria-label="Semana siguiente"
								disabled={!isTimelineDate(nextWeek)}
								onClick={() => onDateChange(nextWeek)}
							>
								<ChevronRight />
							</Button>
						</div>
						<Input
							type="date"
							aria-label="Ir a una fecha"
							min={firstTimelineDate}
							max={lastTimelineDate}
							value={anchorDate}
							className="w-auto bg-white"
							onChange={(event) => {
								if (
									event.target.validity.valid &&
									isTimelineDate(event.target.value)
								)
									onDateChange(event.target.value);
							}}
						/>
					</div>
				</div>
				<UnitAvailabilityLegend />
				<TimelineResults
					key={selectionKey}
					week={week}
					branchId={branchId}
					selection={selection}
					canReadRentals={canReadRentals}
				/>
			</section>
		</>
	);
}

function TimelineResults({
	week,
	branchId,
	selection,
	canReadRentals,
}: {
	week: TimelineWeek;
	branchId: string;
	selection: TimelineSelection;
	canReadRentals: boolean;
}) {
	const [page, setPage] = useState(1);
	const query = useQuery({
		...unitAvailabilityQuery(
			{
				branchId,
				...week,
				page,
				equipmentTypeIds: selection.types.map(({ id }) => id),
				assetIds: selection.units.map(({ id }) => id),
			},
			canReadRentals,
		),
		placeholderData: keepPreviousData,
	});
	const timeline = query.data;
	const totalPages = timeline
		? Math.ceil(timeline.total / timeline.pageSize)
		: 0;

	return (
		<div className="space-y-3">
			{query.isError && (
				<div className="flex flex-wrap items-center gap-3 rounded-lg border bg-white p-4">
					<p role="alert" className="text-sm">
						{timeline
							? "No pudimos actualizar la línea de tiempo."
							: "No pudimos cargar la línea de tiempo."}
					</p>
					<Button
						type="button"
						size="sm"
						variant="outline"
						disabled={query.isFetching}
						onClick={() => query.refetch()}
					>
						Reintentar
					</Button>
					{!timeline && page > 1 && (
						<Button
							type="button"
							size="sm"
							variant="ghost"
							onClick={() => setPage(1)}
						>
							Volver a la primera página
						</Button>
					)}
				</div>
			)}
			{timeline && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs text-neutral-600">
						<p>Zona horaria de la sucursal: {timeline.timezone}</p>
						{timeline.total > 0 && (
							<output>
								{timeline.total === 1
									? "1 unidad"
									: `${timeline.total} unidades`}
							</output>
						)}
					</div>
					{totalPages > 1 && page <= totalPages && (
						<UnitAvailabilityPagination
							page={page}
							totalPages={totalPages}
							onPageChange={setPage}
						/>
					)}
				</div>
			)}
			{(query.isPending || query.isPlaceholderData) && (
				<div className="space-y-2 rounded-lg border bg-white px-4 py-3">
					<output className="block text-sm text-neutral-600">
						Cargando unidades…
					</output>
					<Skeleton className="h-12" />
					<Skeleton className="h-12" />
				</div>
			)}
			{timeline &&
				!query.isPlaceholderData &&
				(timeline.data.length > 0 ? (
					<UnitAvailabilityGrid week={week} timeline={timeline} />
				) : (
					<div className="space-y-2 rounded-lg border border-dashed px-4 py-12 text-center text-sm text-neutral-600">
						<p>
							{timeline.total
								? "Esta página ya no tiene unidades."
								: "No hay unidades en la sucursal que coincidan con la selección."}
						</p>
						{page > 1 && (
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() => setPage(1)}
							>
								Volver a la primera página
							</Button>
						)}
					</div>
				))}
		</div>
	);
}
