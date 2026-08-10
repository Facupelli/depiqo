import type { GetStorefrontBranchSchedulesResponseDto } from "@repo/api-contracts";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@repo/ui/components/calendar";
import { useStorefrontBranchSchedules } from "@/features/tenant-management/branch/branch.queries";
import { localDateToDateParam } from "@/lib/dates/parse";

type StorefrontBranchScheduleSlotType =
	GetStorefrontBranchSchedulesResponseDto[number]["type"];

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

	const boundaryType: StorefrontBranchScheduleSlotType =
		value.from && !value.to ? "RETURN" : "PICKUP";

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
	type: StorefrontBranchScheduleSlotType,
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

		return schedule.specificDate === localDateToDateParam(date);
	});

	if (overrideSchedules.length > 0) {
		return false;
	}

	return !typedSchedules.some(
		(schedule) => schedule.dayOfWeek === date.getDay(),
	);
}
