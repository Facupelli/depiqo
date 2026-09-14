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
	dateParamToLocalDate,
	localDateToDateParam,
	minuteOfDayToTime,
	type RentalPeriodValue,
	timeToMinuteOfDay,
} from "./rental-period";

export type RentalPeriodPickerProps = {
	id: string;
	value: RentalPeriodValue;
	invalid: {
		startDate: boolean;
		startTime: boolean;
		endDate: boolean;
		endTime: boolean;
	};
	onStartDateChange: (value: string) => void;
	onStartDateBlur: () => void;
	onStartTimeChange: (value: number) => void;
	onStartTimeBlur: () => void;
	onEndDateChange: (value: string) => void;
	onEndDateBlur: () => void;
	onEndTimeChange: (value: number) => void;
	onEndTimeBlur: () => void;
};

export function RentalPeriodPicker({
	id,
	value,
	invalid,
	onStartDateChange,
	onStartDateBlur,
	onStartTimeChange,
	onStartTimeBlur,
	onEndDateChange,
	onEndDateBlur,
	onEndTimeChange,
	onEndTimeBlur,
}: RentalPeriodPickerProps) {
	const [open, setOpen] = useState(false);
	const startTimeId = useId();
	const endTimeId = useId();
	const startCalendarDate = dateParamToLocalDate(value.startDate);
	const endCalendarDate = dateParamToLocalDate(value.endDate);
	const dateRange: DateRange = {
		from: startCalendarDate,
		to: endCalendarDate,
	};
	const hasCompletePeriod = Boolean(startCalendarDate && endCalendarDate);
	const hasInvalidValue =
		invalid.startDate ||
		invalid.startTime ||
		invalid.endDate ||
		invalid.endTime;

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
		const minuteOfDay = timeToMinuteOfDay(value);
		if (minuteOfDay !== null) onStartTimeChange(minuteOfDay);
	}

	function handleEndTimeChange(value: string) {
		const minuteOfDay = timeToMinuteOfDay(value);
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
									{formatPeriodBoundary(startCalendarDate, value.startTime)}
								</span>
								<ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
								<span className="truncate">
									{formatPeriodBoundary(endCalendarDate, value.endTime)}
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
							value={minuteOfDayToTime(value.startTime)}
							invalid={invalid.startTime}
							onBlur={onStartTimeBlur}
							onChange={handleStartTimeChange}
						/>
						<TimeInput
							id={endTimeId}
							label="Devolución"
							date={endCalendarDate}
							value={minuteOfDayToTime(value.endTime)}
							invalid={invalid.endTime}
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
	return `${formatPeriodDate(date)}, ${minuteOfDayToTime(minuteOfDay)}`;
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
