import { RentalFinancialReportYearSchema } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { Switch } from "@repo/ui/components/switch";
import {
	CalendarDays,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useId, useState } from "react";
import {
	type FinancialReportSelection,
	financialReportMonthNames,
	getDefaultFinancialReportPeriod,
	getFinancialReportCalendar,
	getFinancialReportPeriodLabel,
} from "./rental-financial-report.utils";

export function RentalFinancialReportToolbar({
	selection,
	timezone,
	onChange,
}: {
	selection: FinancialReportSelection;
	timezone: string;
	onChange: (selection: FinancialReportSelection) => void;
}) {
	const id = useId();
	const calendar = getFinancialReportCalendar(timezone);
	const isCurrentMonth =
		selection.year === calendar.year && selection.period === calendar.month;
	return (
		<div className="flex flex-wrap items-end gap-x-7 gap-y-5 py-1">
			<fieldset className="min-w-0 space-y-2">
				<legend className="text-xs font-medium text-neutral-500">
					Período mostrado
				</legend>
				<div className="flex flex-wrap items-center gap-3">
					<div className="isolate inline-flex -space-x-px rounded-md">
						<Button
							type="button"
							variant="outline"
							aria-pressed={isCurrentMonth}
							className={`h-9 rounded-r-none px-5 text-xs shadow-none pointer-coarse:min-h-11 ${isCurrentMonth ? "z-10 border-depiqo-blue-600 bg-depiqo-blue-600 text-white hover:bg-depiqo-blue-700 hover:text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"}`}
							onClick={() =>
								onChange({
									...selection,
									year: calendar.year,
									period: calendar.month,
								})
							}
						>
							Este mes
						</Button>
						<Button
							type="button"
							variant="outline"
							aria-pressed={selection.period === "all"}
							className={`h-9 rounded-l-none px-5 text-xs shadow-none pointer-coarse:min-h-11 ${selection.period === "all" ? "z-10 border-depiqo-blue-600 bg-depiqo-blue-600 text-white hover:bg-depiqo-blue-700 hover:text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"}`}
							onClick={() => onChange({ ...selection, period: "all" })}
						>
							Todo el año
						</Button>
					</div>
					<ReportPeriodPicker
						selection={selection}
						calendar={calendar}
						onChange={onChange}
					/>
				</div>
			</fieldset>
			<fieldset className="space-y-2 @3xl/finances:border-l @3xl/finances:border-neutral-200 @3xl/finances:pl-7">
				<legend className="text-xs font-medium text-neutral-500">
					Incluir en el total
				</legend>
				<div className="flex min-h-9 flex-wrap items-center gap-x-7 gap-y-3">
					<label
						className="flex min-h-9 cursor-pointer items-center gap-2.5 text-xs text-neutral-700 pointer-coarse:min-h-11"
						htmlFor={`${id}-insurance`}
					>
						<Switch
							id={`${id}-insurance`}
							aria-label="Incluir seguro"
							checked={selection.includeInsurance}
							onCheckedChange={(checked) =>
								onChange({ ...selection, includeInsurance: checked })
							}
							className="data-checked:bg-depiqo-blue-600"
						/>
						Incluir seguro
					</label>
					<label
						className="flex min-h-9 cursor-pointer items-center gap-2.5 text-xs text-neutral-700 pointer-coarse:min-h-11"
						htmlFor={`${id}-delivery`}
					>
						<Switch
							id={`${id}-delivery`}
							aria-label="Incluir entrega"
							checked={selection.includeDelivery}
							onCheckedChange={(checked) =>
								onChange({ ...selection, includeDelivery: checked })
							}
							className="data-checked:bg-depiqo-blue-600"
						/>
						Incluir entrega
					</label>
				</div>
			</fieldset>
		</div>
	);
}

function ReportPeriodPicker({
	selection,
	calendar,
	onChange,
}: {
	selection: FinancialReportSelection;
	calendar: ReturnType<typeof getFinancialReportCalendar>;
	onChange: (selection: FinancialReportSelection) => void;
}) {
	const [open, setOpen] = useState(false);
	const [yearDraft, setYearDraft] = useState(String(selection.year));
	const parsedYear = RentalFinancialReportYearSchema.safeParse(
		Number(yearDraft),
	);
	const pickerYear = parsedYear.success ? parsedYear.data : selection.year;
	const label =
		selection.period === "all"
			? String(selection.year)
			: getFinancialReportPeriodLabel(selection.period, selection.year);
	const yearId = useId();
	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) setYearDraft(String(selection.year));
			}}
		>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						aria-label={`Seleccionar período: ${label}`}
						className="h-9 min-w-48 justify-between gap-3 bg-white px-3 text-xs font-normal shadow-none pointer-coarse:min-h-11"
					>
						<CalendarDays className="size-4 text-neutral-500" />
						<span className="flex-1 text-left tabular-nums">{label}</span>
						<ChevronDown className="size-3.5 text-neutral-400" />
					</Button>
				}
			/>
			<PopoverContent align="start" className="w-72 p-3">
				<form
					className="flex items-center justify-between gap-2"
					onSubmit={(event) => {
						event.preventDefault();
						if (!parsedYear.success) return;
						onChange({
							...selection,
							year: pickerYear,
							period:
								pickerYear === selection.year
									? selection.period
									: getDefaultFinancialReportPeriod(pickerYear, calendar),
						});
						setOpen(false);
					}}
				>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Año anterior"
						disabled={pickerYear <= 1}
						onClick={() => setYearDraft(String(pickerYear - 1))}
					>
						<ChevronLeft className="size-4" />
					</Button>
					<label htmlFor={yearId} className="sr-only">
						Año del reporte
					</label>
					<Input
						id={yearId}
						type="number"
						required
						min={1}
						max={9998}
						step={1}
						value={yearDraft}
						onChange={(event) => setYearDraft(event.target.value)}
						className="h-9 w-24 text-center font-medium tabular-nums"
					/>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label="Año siguiente"
						disabled={pickerYear >= 9998}
						onClick={() => setYearDraft(String(pickerYear + 1))}
					>
						<ChevronRight className="size-4" />
					</Button>
				</form>
				<fieldset className="grid grid-cols-3 gap-1.5 py-2">
					<legend className="sr-only">Mes de {pickerYear}</legend>
					{financialReportMonthNames.map((month, index) => {
						const period = String(
							index + 1,
						) as FinancialReportSelection["period"];
						const selected =
							selection.year === pickerYear && selection.period === period;
						return (
							<Button
								key={month}
								type="button"
								variant="ghost"
								disabled={!parsedYear.success}
								aria-pressed={selected}
								className={`h-10 px-2 text-xs pointer-coarse:min-h-11 ${selected ? "bg-depiqo-blue-50 text-depiqo-blue-700 hover:bg-depiqo-blue-100" : "text-neutral-600"}`}
								onClick={() => {
									onChange({ ...selection, year: pickerYear, period });
									setOpen(false);
								}}
							>
								{month}
							</Button>
						);
					})}
				</fieldset>
				<Button
					type="button"
					variant="outline"
					disabled={!parsedYear.success}
					className="h-9 w-full text-xs"
					onClick={() => {
						onChange({ ...selection, year: pickerYear, period: "all" });
						setOpen(false);
					}}
				>
					Ver todo el año {pickerYear}
				</Button>
			</PopoverContent>
		</Popover>
	);
}
