import type {
	AssetOccupancySpanDto,
	GetAssetAvailabilityTimelineResponseDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { Link } from "@tanstack/react-router";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { formatOrderNumber } from "@/shared/utils/formatters";
import {
	formatTimelineDate,
	getTimelineAxis,
	getUnitLabel,
	groupTimelineRows,
	type TimelineRow,
	type TimelineWeek,
	timelineSpanKey,
} from "./unit-availability.utils";

const occupancyStyles = {
	RESERVATION: {
		label: "Reserva",
		className: "bg-blue-100 text-blue-900 ring-blue-300",
	},
	OPERATIONAL_BUFFER: {
		label: "Margen operativo",
		className: "bg-amber-100 text-amber-950 ring-amber-300",
	},
	TEMPORARY_UNAVAILABILITY: {
		label: "Fuera de servicio temporalmente",
		className: "bg-rose-100 text-rose-950 ring-rose-300",
	},
	RENTAL_OCCUPANCY: {
		label: "Ocupación por alquiler",
		className: "bg-violet-100 text-violet-950 ring-violet-300",
	},
} satisfies Record<
	AssetOccupancySpanDto["kind"],
	{ label: string; className: string }
>;

const statusLabels = {
	INACTIVE: "Inactiva",
	RETIRED: "Retirada",
} satisfies Record<Exclude<TimelineRow["status"], "ACTIVE">, string>;

export function UnitAvailabilityLegend() {
	return (
		<ul
			aria-label="Leyenda de la línea de tiempo"
			className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-neutral-700"
		>
			{Object.entries(occupancyStyles).map(([kind, style]) => (
				<li key={kind} className="flex items-center gap-2">
					<span
						aria-hidden="true"
						className={cn(
							"size-3 rounded-sm ring-1 ring-inset",
							style.className,
						)}
					/>
					{style.label}
				</li>
			))}
		</ul>
	);
}

export function UnitAvailabilityGrid({
	week,
	timeline,
}: {
	week: TimelineWeek;
	timeline: GetAssetAvailabilityTimelineResponseDto;
}) {
	const axis = getTimelineAxis(week, timeline);

	return (
		<div className="overflow-x-auto rounded-lg border bg-white">
			<table className="w-full min-w-244 table-fixed border-separate border-spacing-0 text-left text-sm">
				<caption className="sr-only">Bloqueos registrados por unidad</caption>
				<thead className="bg-neutral-50">
					<tr>
						<th
							scope="col"
							className="sticky left-0 z-10 w-36 border-r border-b bg-neutral-50 px-3 py-2.5 sm:w-44"
						>
							<span className="block font-semibold">Unidad</span>
							<span className="text-xs font-normal text-neutral-500">
								Estado actual
							</span>
						</th>
						<th scope="col" className="border-b p-0">
							<div className="relative h-14">
								{axis.days.map((day) => (
									<div
										key={day.date}
										className="absolute inset-y-0 border-r border-neutral-200 px-3 pt-1.5 last:border-r-0"
										style={{ left: `${day.left}%`, width: `${day.width}%` }}
									>
										<time
											dateTime={day.date}
											className="flex items-baseline gap-2"
										>
											<span className="text-xs font-normal text-neutral-500 capitalize">
												{formatTimelineDate(day.date, "ddd")}
											</span>
											<span className="font-semibold tabular-nums">
												{formatTimelineDate(day.date, "D")}
											</span>
										</time>
										{day.noon !== null && (
											<span
												className="absolute bottom-1.5 -translate-x-1/2 text-[10px] font-normal text-neutral-600 tabular-nums"
												style={{ left: `${day.noon}%` }}
											>
												12:00
											</span>
										)}
									</div>
								))}
							</div>
						</th>
					</tr>
				</thead>
				{groupTimelineRows(timeline.data).map(({ equipmentType, units }) => (
					<tbody
						key={equipmentType.id}
						className="[&:not(:last-child)>tr:last-child>*]:border-b"
					>
						<tr>
							<th
								scope="rowgroup"
								colSpan={2}
								className="border-b bg-neutral-100/80 px-3 py-2"
							>
								<span className="sticky left-3 inline-block text-xs font-semibold text-neutral-700">
									{equipmentType.name}
								</span>
							</th>
						</tr>
						{units.map((unit) => (
							<UnitTimelineRow
								key={unit.assetId}
								unit={unit}
								axis={axis}
								timezone={timeline.timezone}
							/>
						))}
					</tbody>
				))}
			</table>
		</div>
	);
}

function UnitTimelineRow({
	unit,
	axis,
	timezone,
}: {
	unit: TimelineRow;
	axis: ReturnType<typeof getTimelineAxis>;
	timezone: string;
}) {
	const visibleSpans = unit.spans.flatMap((span) => {
		const position = axis.place(span);
		return position ? [{ span, position }] : [];
	});
	const unitLabel = getUnitLabel(unit.serialNumber, unit.assetId);

	return (
		<tr className="h-10 [&:not(:last-child)>*]:border-b">
			<th
				scope="row"
				className="sticky left-0 z-10 border-r bg-white px-3 py-2 font-normal"
			>
				<span className="block font-medium wrap-anywhere">{unitLabel}</span>
				{unit.status !== "ACTIVE" && (
					<Badge variant="outline" className="mt-1">
						{statusLabels[unit.status]}
					</Badge>
				)}
			</th>
			<td className="relative bg-neutral-50/70 p-0">
				{axis.days.map((day) => (
					<div
						key={day.date}
						aria-hidden="true"
						className="pointer-events-none absolute inset-y-0 border-r border-neutral-200 last:border-r-0"
						style={{ left: `${day.left}%`, width: `${day.width}%` }}
					>
						{day.noon !== null && (
							<span
								className="absolute inset-y-0 border-l border-dashed border-neutral-200/80"
								style={{ left: `${day.noon}%` }}
							/>
						)}
					</div>
				))}
				{visibleSpans.length ? (
					visibleSpans.map(({ span, position }) => (
						<TimelineSpan
							key={timelineSpanKey(span)}
							span={span}
							position={position}
							timezone={timezone}
							unitLabel={unitLabel}
						/>
					))
				) : (
					<span className="relative px-3 text-xs text-neutral-500">
						Sin bloqueos
					</span>
				)}
			</td>
		</tr>
	);
}

function TimelineSpan({
	span,
	position,
	timezone,
	unitLabel,
}: {
	span: AssetOccupancySpanDto;
	position: { left: number; width: number };
	timezone: string;
	unitLabel: string;
}) {
	const { label, className } = occupancyStyles[span.kind];
	const formatInstant = (instant: string) =>
		formatTimestampInTimezone(instant, timezone, "D MMM YYYY, HH:mm (Z)");
	const start = formatInstant(span.startsAt);
	const end = formatInstant(span.endsAt);
	const rental = span.kind !== "TEMPORARY_UNAVAILABILITY" ? span.rental : null;

	return (
		<Popover>
			<PopoverTrigger
				aria-label={`${label}, ${unitLabel}, ${start} a ${end}`}
				className={cn(
					"absolute top-1/2 h-8 -translate-y-1/2 overflow-hidden rounded-sm text-left text-xs font-medium ring-1 ring-inset hover:brightness-95 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
					className,
				)}
				style={{ left: `${position.left}%`, width: `${position.width}%` }}
			>
				<span className="block truncate px-2">{label}</span>
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-72 max-w-(--available-width) p-3"
			>
				<PopoverTitle>{label}</PopoverTitle>
				<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
					<dt className="text-neutral-500">Desde</dt>
					<dd>
						<time dateTime={span.startsAt}>{start}</time>
					</dd>
					<dt className="text-neutral-500">Hasta</dt>
					<dd>
						<time dateTime={span.endsAt}>{end}</time>
					</dd>
					{span.kind === "TEMPORARY_UNAVAILABILITY" && (
						<>
							<dt className="text-neutral-500">Motivo</dt>
							<dd className="max-h-48 overflow-y-auto wrap-anywhere whitespace-pre-wrap">
								{span.reason}
							</dd>
						</>
					)}
				</dl>
				{rental && (
					<Link
						to="/dashboard/orders/$orderId"
						params={{ orderId: rental.id }}
						className="self-start font-medium text-primary underline underline-offset-2"
					>
						Alquiler #{formatOrderNumber(rental.rentalNumber)}
					</Link>
				)}
			</PopoverContent>
		</Popover>
	);
}
