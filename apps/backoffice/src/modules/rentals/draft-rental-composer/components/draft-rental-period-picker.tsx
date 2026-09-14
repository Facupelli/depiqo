import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import { Input } from "@repo/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { cn } from "@repo/ui/lib/utils";
import { es } from "date-fns/locale";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { useId, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
	draftRentalMinuteOfDayToTime,
	draftRentalTimeToMinuteOfDay,
} from "../draft-rental-composer.schema";

export type DraftRentalPeriodPickerProps = {
	id: string;
	startDate: string;
	startTime: number;
	endDate: string;
	endTime: number;
	startDateInvalid: boolean;
	startTimeInvalid: boolean;
	endDateInvalid: boolean;
	endTimeInvalid: boolean;
	onStartDateChange: (value: string) => void;
	onStartDateBlur: () => void;
	onStartTimeChange: (value: number) => void;
	onStartTimeBlur: () => void;
	onEndDateChange: (value: string) => void;
	onEndDateBlur: () => void;
	onEndTimeChange: (value: number) => void;
	onEndTimeBlur: () => void;
};

export function DraftRentalPeriodPicker({
	id,
	startDate,
	startTime,
	endDate,
	endTime,
	startDateInvalid,
	startTimeInvalid,
	endDateInvalid,
	endTimeInvalid,
	onStartDateChange,
	onStartDateBlur,
	onStartTimeChange,
	onStartTimeBlur,
	onEndDateChange,
	onEndDateBlur,
	onEndTimeChange,
	onEndTimeBlur,
}: DraftRentalPeriodPickerProps) {
	const [open, setOpen] = useState(false);
	const startTimeId = useId();
	const endTimeId = useId();
	const startCalendarDate = dateParamToLocalDate(startDate);
	const endCalendarDate = dateParamToLocalDate(endDate);
	const dateRange: DateRange = {
		from: startCalendarDate,
		to: endCalendarDate,
	};
	const hasCompletePeriod = Boolean(startCalendarDate && endCalendarDate);
	const hasInvalidValue =
		startDateInvalid || startTimeInvalid || endDateInvalid || endTimeInvalid;

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (!nextOpen) {
			onStartDateBlur();
			onEndDateBlur();
		}
	}

	function handleDateChange(nextRange: DateRange | undefined) {
		onStartDateChange(
			nextRange?.from ? localDateToDateParam(nextRange.from) : "",
		);
		onEndDateChange(nextRange?.to ? localDateToDateParam(nextRange.to) : "");
	}

	function handleStartTimeChange(value: string) {
		const minuteOfDay = draftRentalTimeToMinuteOfDay(value);
		if (minuteOfDay !== null) onStartTimeChange(minuteOfDay);
	}

	function handleEndTimeChange(value: string) {
		const minuteOfDay = draftRentalTimeToMinuteOfDay(value);
		if (minuteOfDay !== null) onEndTimeChange(minuteOfDay);
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<Button
						id={id}
						type="button"
						variant="outline"
						aria-invalid={hasInvalidValue}
						className={cn(
							"h-auto min-h-9 w-full justify-start gap-3 px-3 py-2 text-left font-normal",
							hasInvalidValue &&
								"border-destructive/50 text-destructive ring-destructive/20",
						)}
					>
						<CalendarDays className="size-4 shrink-0 text-muted-foreground" />
						{hasCompletePeriod ? (
							<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 tabular-nums">
								<span className="truncate">
									{formatPeriodBoundary(startCalendarDate, startTime)}
								</span>
								<ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
								<span className="truncate">
									{formatPeriodBoundary(endCalendarDate, endTime)}
								</span>
							</div>
						) : (
							<span className="text-muted-foreground">
								Seleccioná las fechas y horarios
							</span>
						)}
					</Button>
				}
			/>
			<PopoverContent
				align="start"
				className="w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
			>
				<Calendar
					locale={es}
					mode="range"
					defaultMonth={startCalendarDate}
					selected={dateRange}
					onSelect={handleDateChange}
					numberOfMonths={1}
					className="mx-auto pb-2 [--cell-size:clamp(1.5rem,10vw,2rem)] [&_.rdp-month]:gap-2 [&_.rdp-week]:mt-1"
				/>
				<div className="border-t px-3 pt-3 pb-3">
					<div className="mb-2.5 flex items-center gap-2 text-muted-foreground">
						<Clock3 className="size-4" />
						<span className="text-xs font-semibold uppercase tracking-wide">
							Horarios
						</span>
					</div>
					<div className="grid gap-3 min-[22rem]:grid-cols-2">
						<TimeInput
							id={startTimeId}
							label="Inicio"
							date={startCalendarDate}
							value={draftRentalMinuteOfDayToTime(startTime)}
							invalid={startTimeInvalid}
							onBlur={onStartTimeBlur}
							onChange={handleStartTimeChange}
						/>
						<TimeInput
							id={endTimeId}
							label="Devolución"
							date={endCalendarDate}
							value={draftRentalMinuteOfDayToTime(endTime)}
							invalid={endTimeInvalid}
							onBlur={onEndTimeBlur}
							onChange={handleEndTimeChange}
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function TimeInput({
	id,
	label,
	date,
	value,
	invalid,
	onBlur,
	onChange,
}: {
	id: string;
	label: string;
	date?: Date;
	value: string;
	invalid: boolean;
	onBlur: () => void;
	onChange: (value: string) => void;
}) {
	return (
		<div className="min-w-0 space-y-1.5">
			<label htmlFor={id} className="block text-sm font-medium">
				{label}
			</label>
			<p className="truncate text-xs text-muted-foreground">
				{date ? formatCalendarDate(date) : "Elegí una fecha"}
			</p>
			<Input
				id={id}
				type="time"
				step={60}
				aria-invalid={invalid}
				value={value}
				onBlur={onBlur}
				onChange={(event) => onChange(event.target.value)}
			/>
		</div>
	);
}

function formatPeriodBoundary(date: Date | undefined, minuteOfDay: number) {
	if (!date) return "Fecha pendiente";
	return `${formatPeriodDate(date)}, ${draftRentalMinuteOfDayToTime(minuteOfDay)}`;
}

function formatPeriodDate(date: Date): string {
	return `${new Intl.DateTimeFormat("es-AR", {
		day: "numeric",
		month: "short",
	}).format(date)}`;
}

function formatCalendarDate(date: Date): string {
	return new Intl.DateTimeFormat("es-AR", {
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(date);
}

function dateParamToLocalDate(date: string): Date | undefined {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return undefined;

	const [year, month, day] = date.split("-").map(Number);
	const result = new Date(year, month - 1, day);
	if (
		result.getFullYear() !== year ||
		result.getMonth() !== month - 1 ||
		result.getDate() !== day
	) {
		return undefined;
	}

	return result;
}

function localDateToDateParam(date: Date): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}
