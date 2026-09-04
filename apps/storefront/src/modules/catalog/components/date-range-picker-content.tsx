import type {
	BranchScheduleSlotDto,
	GetStorefrontBranchSchedulesResponseDto,
} from "@repo/api-contracts";
import { Calendar } from "@repo/ui/components/calendar";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { localDateToDateParam } from "@/lib/dates/parse";
import {
	useStorefrontBranchScheduleSlots,
	useStorefrontBranchSchedules,
} from "@/modules/tenant-management/branches/branch-schedule.queries";

type StorefrontBranchScheduleSlotType =
	GetStorefrontBranchSchedulesResponseDto[number]["type"];

type DateRangePickerContentProps = {
	branchId?: string;
	value: DateRange;
	pickupInstant?: string;
	returnInstant?: string;
	onDateChange: (range: DateRange | undefined) => void;
	onPickupChange: (slot: BranchScheduleSlotDto) => void;
	onReturnChange: (slot: BranchScheduleSlotDto) => void;
	numberOfMonths: number;
};

export function DateRangePickerContent({
	branchId,
	value,
	pickupInstant,
	returnInstant,
	onDateChange,
	onPickupChange,
	onReturnChange,
	numberOfMonths,
}: DateRangePickerContentProps) {
	const { data: schedules } = useStorefrontBranchSchedules(branchId);
	const periodStart = value.from ? localDateToDateParam(value.from) : undefined;
	const periodEnd = value.to ? localDateToDateParam(value.to) : undefined;
	const { data: slots, isLoading } = useStorefrontBranchScheduleSlots(
		branchId,
		periodStart && periodEnd ? { periodStart, periodEnd } : undefined,
	);
	const boundaryType: StorefrontBranchScheduleSlotType =
		value.from && !value.to ? "RETURN" : "PICKUP";
	const pickupSlot = slots?.pickupSlots?.find(
		(slot) => slot.instant === pickupInstant,
	);
	const returnSlot = slots?.returnSlots?.find(
		(slot) => slot.instant === returnInstant,
	);

	return (
		<div>
			<Calendar
				locale={es}
				mode="range"
				min={0}
				defaultMonth={value.from}
				selected={value}
				onSelect={onDateChange}
				numberOfMonths={numberOfMonths}
				disabled={(date) =>
					isScheduleBoundaryDisabled(date, boundaryType, schedules)
				}
			/>
			{value.from && value.to ? (
				<div className="grid gap-4 border-t p-4 sm:grid-cols-2">
					<TimeSelector
						label="RETIRO"
						date={value.from}
						value={pickupSlot?.instant}
						slots={slots?.pickupSlots}
						loading={isLoading}
						onChange={onPickupChange}
					/>
					<TimeSelector
						label="DEVOLUCIÓN"
						date={value.to}
						value={returnSlot?.instant}
						slots={slots?.returnSlots}
						loading={isLoading}
						disableThrough={pickupSlot?.instant}
						onChange={onReturnChange}
					/>
				</div>
			) : null}
		</div>
	);
}

function TimeSelector({
	label,
	date,
	value,
	slots,
	loading,
	disableThrough,
	onChange,
}: {
	label: string;
	date: Date;
	value?: string;
	slots?: BranchScheduleSlotDto[];
	loading: boolean;
	disableThrough?: string;
	onChange: (slot: BranchScheduleSlotDto) => void;
}) {
	return (
		<div className="min-w-0 space-y-2">
			<div>
				<p className="text-[11px] font-semibold text-muted-foreground">
					{label}
				</p>
				<p className="text-sm font-medium capitalize">
					{new Intl.DateTimeFormat("es-AR", {
						weekday: "short",
						day: "numeric",
						month: "short",
					}).format(date)}
				</p>
			</div>
			<Select
				value={value}
				disabled={loading || slots?.length === 0}
				onValueChange={(nextValue: string | null) => {
					const slot = slots?.find(
						(candidate) => candidate.instant === nextValue,
					);
					if (slot) onChange(slot);
				}}
				items={slots?.map((slot) => ({
					label: formatMinutes(slot.minuteOfDay),
					value: slot.instant,
				}))}
			>
				<SelectTrigger className="w-full" aria-label={label}>
					<SelectValue
						placeholder={
							loading
								? "Cargando..."
								: slots?.length === 0
									? "Sin horarios"
									: "Seleccionar"
						}
					/>
				</SelectTrigger>
				<SelectContent>
					{slots?.map((slot) => (
						<SelectItem
							key={slot.instant}
							value={slot.instant}
							disabled={
								disableThrough !== undefined &&
								Date.parse(slot.instant) <= Date.parse(disableThrough)
							}
						>
							{formatMinutes(slot.minuteOfDay)}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

function isScheduleBoundaryDisabled(
	date: Date,
	type: StorefrontBranchScheduleSlotType,
	schedules?: GetStorefrontBranchSchedulesResponseDto,
): boolean {
	if (!schedules || schedules.length === 0) return false;

	const typedSchedules = schedules.filter((schedule) => schedule.type === type);
	const overrideSchedules = typedSchedules.filter(
		(schedule) => schedule.specificDate === localDateToDateParam(date),
	);

	if (overrideSchedules.length > 0) return false;

	return !typedSchedules.some(
		(schedule) => schedule.dayOfWeek === date.getDay(),
	);
}

function formatMinutes(minutes: number): string {
	return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
		minutes % 60,
	).padStart(2, "0")}`;
}
