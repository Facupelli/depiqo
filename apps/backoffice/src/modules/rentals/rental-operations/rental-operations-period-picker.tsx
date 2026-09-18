import type { LocalDate } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Calendar } from "@repo/ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { es } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import type { DateRange } from "react-day-picker";
import {
	dateParamToLocalDate,
	localDateToDateParam,
} from "@/modules/rentals/shared/rental-period/rental-period";

type RentalOperationsPeriodPickerProps = {
	from: LocalDate;
	to: LocalDate;
	today: LocalDate;
	onChange: (from: LocalDate, to: LocalDate) => void;
};

export function RentalOperationsPeriodPicker({
	from,
	to,
	today,
	onChange,
}: RentalOperationsPeriodPickerProps) {
	const [open, setOpen] = useState(false);
	const fromDate = dateParamToLocalDate(from);
	const toDate = dateParamToLocalDate(to);
	const selected: DateRange = { from: fromDate, to: toDate };

	function handleSelect(nextRange: DateRange | undefined) {
		if (!nextRange?.from) {
			return;
		}

		const nextFrom = localDateToDateParam(nextRange.from);
		const nextTo = localDateToDateParam(nextRange.to ?? nextRange.from);
		onChange(nextFrom, nextTo);
	}

	function handleToday() {
		onChange(today, today);
		setOpen(false);
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="w-full justify-start gap-2 bg-white font-normal sm:w-auto"
					>
						<CalendarDays className="size-4 text-muted-foreground" />
						<span className="truncate tabular-nums">
							{formatPeriodLabel(fromDate, toDate)}
						</span>
					</Button>
				}
			/>
			<PopoverContent
				align="end"
				className="w-[18rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0"
			>
				<Calendar
					locale={es}
					mode="range"
					defaultMonth={fromDate}
					selected={selected}
					onSelect={handleSelect}
					numberOfMonths={1}
					className="mx-auto pb-2 [--cell-size:clamp(1.5rem,10vw,2rem)] [&_.rdp-month]:gap-2 [&_.rdp-week]:mt-1"
				/>
				<div className="border-t p-3">
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={handleToday}
					>
						Hoy
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function formatPeriodLabel(from?: Date, to?: Date): string {
	if (!from || !to) {
		return "Seleccionar período";
	}

	const formatter = new Intl.DateTimeFormat("es-AR", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});

	if (from.getTime() === to.getTime()) {
		return formatter.format(from);
	}

	return `${formatter.format(from)} - ${formatter.format(to)}`;
}
