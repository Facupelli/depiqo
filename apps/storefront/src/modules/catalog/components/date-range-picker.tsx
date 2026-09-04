import type { BranchScheduleSlotDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Skeleton } from "@repo/ui/components/skeleton";
import { cn } from "@repo/ui/lib/utils";
import { CalendarIcon } from "lucide-react";
import { lazy, Suspense, useState } from "react";
import type { DateRange } from "react-day-picker";
import dayjs from "@/lib/dates/dayjs";
import { dateParamToLocalDate, localDateToDateParam } from "@/lib/dates/parse";
import { useStorefrontBranchScheduleSlots } from "@/modules/tenant-management/branches/branch-schedule.queries";

const LazyDateRangePickerContent = lazy(() =>
	import("./date-range-picker-content").then((module) => ({
		default: module.DateRangePickerContent,
	})),
);

const EMPTY_DATE_RANGE: DateRange = { from: undefined, to: undefined };

export interface ExactRentalPeriodSelection {
	periodStart: string;
	periodEnd: string;
	pickupInstant: string;
	returnInstant: string;
}

interface DateRangePickerProps {
	branchId?: string;
	pickupDate?: string;
	returnDate?: string;
	pickupInstant?: string;
	returnInstant?: string;
	onChange: (period: ExactRentalPeriodSelection) => void;
	numberOfMonths?: number;
	buttonClassName?: string;
	datesButtonClassName?: string;
}

export function DateRangePicker({
	pickupDate,
	returnDate,
	pickupInstant,
	returnInstant,
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
	const [draftPickupInstant, setDraftPickupInstant] = useState(pickupInstant);
	const [draftReturnInstant, setDraftReturnInstant] = useState(returnInstant);
	const slotQuery = useStorefrontBranchScheduleSlots(
		branchId,
		pickupDate && returnDate
			? { periodStart: pickupDate, periodEnd: returnDate }
			: undefined,
	);
	const committedPickupSlot = slotQuery.data?.pickupSlots?.find(
		(slot) => slot.instant === pickupInstant,
	);
	const committedReturnSlot = slotQuery.data?.returnSlots?.find(
		(slot) => slot.instant === returnInstant,
	);
	const hasCompleteCommittedPeriod = Boolean(
		pickupDate &&
			returnDate &&
			committedPickupSlot &&
			committedReturnSlot &&
			Date.parse(committedReturnSlot.instant) >
				Date.parse(committedPickupSlot.instant),
	);
	const displayValue = open ? (draftValue ?? EMPTY_DATE_RANGE) : committedValue;
	const displayPickupSlot = open
		? findSlot(slotQuery.data?.pickupSlots, draftPickupInstant)
		: committedPickupSlot;
	const displayReturnSlot = open
		? findSlot(slotQuery.data?.returnSlots, draftReturnInstant)
		: committedReturnSlot;

	function handleOpenChange(nextOpen: boolean) {
		setOpen(nextOpen);
		if (nextOpen) {
			setHasOpened(true);
			setDraftValue(committedValue);
			setDraftPickupInstant(pickupInstant);
			setDraftReturnInstant(returnInstant);
		}
	}

	function handleDateChange(nextRange: DateRange | undefined) {
		const previousPickup = draftValue?.from
			? localDateToDateParam(draftValue.from)
			: undefined;
		const previousReturn = draftValue?.to
			? localDateToDateParam(draftValue.to)
			: undefined;
		const nextPickup = nextRange?.from
			? localDateToDateParam(nextRange.from)
			: undefined;
		const nextReturn = nextRange?.to
			? localDateToDateParam(nextRange.to)
			: undefined;

		setDraftValue(nextRange);
		if (nextPickup !== previousPickup) {
			setDraftPickupInstant(undefined);
			setDraftReturnInstant(undefined);
		} else if (nextReturn !== previousReturn) {
			setDraftReturnInstant(undefined);
		}
	}

	function handlePickupChange(slot: BranchScheduleSlotDto) {
		setDraftPickupInstant(slot.instant);
		setDraftReturnInstant(undefined);
	}

	function handleReturnChange(slot: BranchScheduleSlotDto) {
		if (!draftValue?.from || !draftValue.to || !draftPickupInstant) return;
		if (Date.parse(slot.instant) <= Date.parse(draftPickupInstant)) return;

		const period = {
			periodStart: localDateToDateParam(draftValue.from),
			periodEnd: localDateToDateParam(draftValue.to),
			pickupInstant: draftPickupInstant,
			returnInstant: slot.instant,
		};
		setDraftReturnInstant(slot.instant);
		onChange(period);
		setOpen(false);
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
						{hasCompleteCommittedPeriod &&
						displayValue.from &&
						displayValue.to ? (
							<>
								<PeriodBoundary
									date={displayValue.from}
									slot={displayPickupSlot}
									className={datesButtonClassName}
									showIcon
								/>
								<span className="mx-3 text-sm text-muted-foreground">→</span>
								<PeriodBoundary
									date={displayValue.to}
									slot={displayReturnSlot}
									className={datesButtonClassName}
								/>
							</>
						) : (
							<div className="flex min-w-0 items-center gap-2">
								<CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
								<span
									className={cn(
										"min-w-0 truncate text-sm font-medium text-foreground",
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
			<PopoverContent
				className="w-auto max-w-[calc(100vw-2rem)] p-0"
				align="start"
			>
				{hasOpened ? (
					<Suspense
						fallback={
							<DateRangePickerContentSkeleton numberOfMonths={numberOfMonths} />
						}
					>
						<LazyDateRangePickerContent
							branchId={branchId}
							value={draftValue ?? EMPTY_DATE_RANGE}
							pickupInstant={draftPickupInstant}
							returnInstant={draftReturnInstant}
							onDateChange={handleDateChange}
							onPickupChange={handlePickupChange}
							onReturnChange={handleReturnChange}
							numberOfMonths={numberOfMonths}
						/>
					</Suspense>
				) : null}
			</PopoverContent>
		</Popover>
	);
}

function PeriodBoundary({
	date,
	slot,
	className,
	showIcon = false,
}: {
	date: Date;
	slot?: BranchScheduleSlotDto;
	className?: string;
	showIcon?: boolean;
}) {
	return (
		<div
			className={cn(
				"flex min-w-0 items-center gap-2 text-foreground",
				className,
			)}
		>
			{showIcon ? (
				<CalendarIcon className="size-4 shrink-0 text-muted-foreground" />
			) : null}
			<span className="min-w-0 truncate text-sm font-medium tabular-nums">
				{dayjs(date).format("DD MMM YYYY")}, {formatMinutes(slot?.minuteOfDay)}
			</span>
		</div>
	);
}

function findSlot(
	slots: BranchScheduleSlotDto[] | undefined,
	instant: string | undefined,
): BranchScheduleSlotDto | undefined {
	return slots?.find((slot) => slot.instant === instant);
}

function formatMinutes(minutes: number | undefined): string {
	if (minutes === undefined) return "";
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
		minutes % 60,
	).padStart(2, "0")}`;
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
				dayKeys: Array.from(
					{ length: 35 },
					(_, dayIndex) => `day-${index}-${dayIndex}`,
				),
			})).map((month) => (
				<div key={month.monthKey} className="space-y-3">
					<Skeleton className="h-8 w-32" />
					<div className="grid grid-cols-7 gap-2">
						{month.dayKeys.map((dayKey) => (
							<Skeleton key={dayKey} className="size-8 rounded-md" />
						))}
					</div>
				</div>
			))}
		</div>
	);
}
