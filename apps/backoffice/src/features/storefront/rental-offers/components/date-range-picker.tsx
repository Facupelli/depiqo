import { CalendarIcon } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@repo/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Skeleton } from "@repo/ui/components/skeleton";
import dayjs from "@/lib/dates/dayjs";
import { dateParamToLocalDate } from "@/lib/dates/parse";
import { cn } from "@/lib/utils";

const LazyDateRangePickerContent = lazy(() =>
	import("./date-range-picker-content").then((module) => ({
		default: module.DateRangePickerContent,
	})),
);

const EMPTY_DATE_RANGE: DateRange = {
	from: undefined,
	to: undefined,
};

interface DateRangePickerProps {
	branchId?: string;
	pickupDate?: string;
	returnDate?: string;
	onChange: (range: DateRange | undefined) => void;
	numberOfMonths?: number;
	buttonClassName?: string;
	datesButtonClassName?: string;
}

export function DateRangePicker({
	pickupDate,
	returnDate,
	onChange,
	numberOfMonths = 2,
	buttonClassName,
	datesButtonClassName,
	branchId,
}: DateRangePickerProps) {
	const [open, setOpen] = useState(false);
	const [hasOpened, setHasOpened] = useState(false);
	const committedValue: DateRange = {
		from: pickupDate ? dateParamToLocalDate(pickupDate) : undefined,
		to: returnDate ? dateParamToLocalDate(returnDate) : undefined,
	};
	const [draftValue, setDraftValue] = useState<DateRange | undefined>(
		committedValue,
	);
	const displayValue: DateRange = open
		? (draftValue ?? EMPTY_DATE_RANGE)
		: committedValue;

	const fromLabel = displayValue.from
		? dayjs(displayValue.from).format("DD MMM YYYY")
		: "Seleccionar";

	const toLabel = displayValue.to
		? dayjs(displayValue.to).format("DD MMM YYYY")
		: "Seleccionar";

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (nextOpen) {
			setHasOpened(true);
			setDraftValue(committedValue);
		}
	}

	function handleRangeSelect(nextRange: DateRange | undefined) {
		setDraftValue(nextRange);

		if (nextRange?.from && nextRange.to) {
			onChange(nextRange);
			setOpen(false);
		}
	}

	return (
		<Popover open={open} onOpenChange={handleOpenChange}>
			<PopoverTrigger
				render={
					<Button
						variant="ghost"
						className={cn(
							"gap-0 hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
							buttonClassName,
						)}
					>
						{displayValue.from && displayValue.to ? (
							<>
								<div
									className={cn(
										"flex min-w-0 items-center gap-2 text-foreground",
										datesButtonClassName,
									)}
								>
									<CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
									<span className="min-w-0 truncate text-sm font-medium tabular-nums">
										{fromLabel}
									</span>
								</div>
								<span className="mx-3 text-muted-foreground text-sm">→</span>
								<span
									className={cn(
										"min-w-0 truncate text-sm font-medium tabular-nums text-foreground",
										datesButtonClassName,
									)}
								>
									{toLabel}
								</span>
							</>
						) : (
							<div className="flex min-w-0 items-center gap-2">
								<CalendarIcon className="h-4 w-4 text-muted-foreground shrink-0" />
								<span
									className={cn(
										"min-w-0 truncate text-sm font-medium tabular-nums text-foreground",
										datesButtonClassName,
									)}
								>
									Selecciona el periodo de alquiler
								</span>
							</div>
						)}
					</Button>
				}
			/>
			<PopoverContent className="w-auto p-0" align="start">
				{hasOpened ? (
					<Suspense
						fallback={
							<DateRangePickerContentSkeleton numberOfMonths={numberOfMonths} />
						}
					>
						<LazyDateRangePickerContent
							branchId={branchId}
							value={draftValue ?? EMPTY_DATE_RANGE}
							onChange={handleRangeSelect}
							numberOfMonths={numberOfMonths}
						/>
					</Suspense>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

function DateRangePickerContentSkeleton({
	numberOfMonths,
}: {
	numberOfMonths: number;
}) {
	return (
		<div
			className={cn(
				"grid gap-3 p-3",
				numberOfMonths > 1 ? "md:grid-cols-2" : "grid-cols-1",
			)}
		>
			{Array.from({ length: numberOfMonths }, (_, index) => ({
				monthKey: `date-range-skeleton-month-${index + 1}`,
				dayKeys: Array.from({ length: 35 }, (_, dayIndex) => {
					const week = Math.floor(dayIndex / 7) + 1;
					const day = (dayIndex % 7) + 1;

					return `date-range-skeleton-month-${index + 1}-week-${week}-day-${day}`;
				}),
			})).map((month) => (
				<div key={month.monthKey} className="space-y-3">
					<Skeleton className="h-8 w-32" />
					<div className="grid grid-cols-7 gap-2">
						{month.dayKeys.map((dayKey) => (
							<Skeleton key={dayKey} className="h-8 w-8 rounded-md" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}
