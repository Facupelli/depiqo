import type { GetStorefrontBranchSchedulesResponseDto } from "@repo/api-contracts";
import { ScheduleSlotType } from "@repo/types";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { useStorefrontBranchSchedules } from "@/v2/features/tenant-management/branch/branch.queries";

type DateRangePickerContentProps = {
	branchId?: string;
	value: DateRange;
	onChange: (range: DateRange | undefined) => void;
	numberOfMonths: number;
};

export function DateRangePickerContent({
	branchId,
	value,
	onChange,
	numberOfMonths,
}: DateRangePickerContentProps) {
	const { data: schedules } = useStorefrontBranchSchedules(branchId);

	const boundaryType =
		value.from && !value.to ? ScheduleSlotType.RETURN : ScheduleSlotType.PICKUP;

	return (
		<Calendar
			locale={es}
			mode="range"
			min={1}
			defaultMonth={value.from}
			selected={value}
			onSelect={onChange}
			numberOfMonths={numberOfMonths}
			disabled={(date) =>
				isScheduleBoundaryDisabled(date, boundaryType, schedules)
			}
		/>
	);
}

function isScheduleBoundaryDisabled(
	date: Date,
	type: ScheduleSlotType,
	schedules?: GetStorefrontBranchSchedulesResponseDto,
): boolean {
	if (!schedules || schedules.length === 0) {
		return false;
	}

	const typedSchedules = schedules.filter((schedule) => schedule.type === type);
	const overrideSchedules = typedSchedules.filter((schedule) => {
		if (!schedule.specificDate) {
			return false;
		}

		return isSameCalendarDay(new Date(schedule.specificDate), date);
	});

	if (overrideSchedules.length > 0) {
		return false;
	}

	return !typedSchedules.some(
		(schedule) => schedule.dayOfWeek === date.getDay(),
	);
}

function isSameCalendarDay(left: Date, right: Date): boolean {
	const leftDate = new Date(left);
	const rightDate = new Date(right);

	return (
		!Number.isNaN(leftDate.getTime()) &&
		!Number.isNaN(rightDate.getTime()) &&
		leftDate.getFullYear() === rightDate.getFullYear() &&
		leftDate.getMonth() === rightDate.getMonth() &&
		leftDate.getDate() === rightDate.getDate()
	);
}
