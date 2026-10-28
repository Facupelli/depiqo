import {
	type ReportQueryDto,
	ReportQuerySchema,
	ReportRentalStatusSchema,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState } from "react";
import { branchQueries } from "@/modules/settings/branches/public";

export type ReportFilterChanges = Partial<
	Omit<ReportQueryDto, "page" | "pageSize">
>;

const months = [
	"Enero",
	"Febrero",
	"Marzo",
	"Abril",
	"Mayo",
	"Junio",
	"Julio",
	"Agosto",
	"Septiembre",
	"Octubre",
	"Noviembre",
	"Diciembre",
];
const statusLabels = {
	CONFIRMED: "Confirmados",
	COMPLETED: "Completados",
	CANCELLED: "Cancelados",
};
const controlClass =
	"h-10 w-full min-w-0 justify-between rounded-lg border-input bg-background px-3 text-sm font-normal text-foreground shadow-none pointer-coarse:min-h-11";

export function ReportToolbar({
	value,
	onChange,
}: {
	value: ReportQueryDto;
	onChange: (changes: ReportFilterChanges) => void;
}) {
	const id = useId();
	const branchesQuery = useSuspenseQuery(branchQueries.list());
	const branchItems = [
		{ label: "Todas las sucursales", value: "__all__" },
		...branchesQuery.data.map((branch) => ({
			label: branch.name,
			value: branch.id,
		})),
	];
	if (
		value.branchId &&
		!branchItems.some((item) => item.value === value.branchId)
	) {
		branchItems.push({
			label: "Sucursal no disponible",
			value: value.branchId,
		});
	}
	const monthItems = [
		{ label: "Todos los meses", value: "all" },
		...months.map((label, index) => ({ label, value: String(index + 1) })),
	];
	const statusLabel =
		value.statuses.length === 3
			? "Todos los estados"
			: value.statuses.length === 2 && !value.statuses.includes("CANCELLED")
				? "Confirmados y completados"
				: value.statuses.map((status) => statusLabels[status]).join(" y ");
	return (
		<div className="space-y-2">
			<div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(8rem,0.6fr)_minmax(10rem,1fr)_minmax(12rem,1.2fr)_minmax(12rem,1.2fr)]">
				<div className="min-w-0 space-y-2">
					<label
						htmlFor={`${id}-year`}
						className="block text-xs font-medium text-muted-foreground"
					>
						Año
					</label>
					<ReportYearPicker
						id={`${id}-year`}
						year={value.year}
						onChange={(year) => onChange({ year })}
					/>
				</div>
				<div className="min-w-0 space-y-2">
					<label
						htmlFor={`${id}-month`}
						className="block text-xs font-medium text-muted-foreground"
					>
						Mes
					</label>
					<Select
						value={value.month === undefined ? "all" : String(value.month)}
						items={monthItems}
						onValueChange={(month) => {
							if (month)
								onChange({
									month: month === "all" ? undefined : Number(month),
								});
						}}
					>
						<SelectTrigger id={`${id}-month`} className={controlClass}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{monthItems.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="min-w-0 space-y-2">
					<label
						htmlFor={`${id}-branch`}
						className="block text-xs font-medium text-muted-foreground"
					>
						Sucursal
					</label>
					<Select
						value={value.branchId ?? "__all__"}
						items={branchItems}
						onValueChange={(branchId) => {
							if (branchId)
								onChange({
									branchId: branchId === "__all__" ? undefined : branchId,
								});
						}}
					>
						<SelectTrigger id={`${id}-branch`} className={controlClass}>
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{branchItems.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				<div className="min-w-0 space-y-2">
					<label
						htmlFor={`${id}-statuses`}
						className="block text-xs font-medium text-muted-foreground"
					>
						Estados
					</label>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									id={`${id}-statuses`}
									aria-label={`Estados: ${statusLabel}`}
									variant="outline"
									className={controlClass}
								>
									<span className="truncate">{statusLabel}</span>
									<ChevronDown className="size-4 shrink-0 text-muted-foreground" />
								</Button>
							}
						/>
						<DropdownMenuContent align="start" className="min-w-64">
							{ReportRentalStatusSchema.options.map((status) => (
								<DropdownMenuCheckboxItem
									key={status}
									checked={value.statuses.includes(status)}
									closeOnClick={false}
									disabled={
										value.statuses.length === 1 &&
										value.statuses.includes(status)
									}
									onCheckedChange={(checked) =>
										onChange({
											statuses: ReportRentalStatusSchema.options.filter(
												(candidate) =>
													candidate === status
														? checked
														: value.statuses.includes(candidate),
											),
										})
									}
								>
									{statusLabels[status]}
								</DropdownMenuCheckboxItem>
							))}
							<p className="max-w-72 border-t px-2 pt-2 pb-1 text-xs leading-relaxed text-muted-foreground">
								Los cancelados solo incluyen alquileres previamente confirmados.
							</p>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
			{branchesQuery.isError ? (
				<div
					role="alert"
					className="flex flex-wrap items-center gap-2 text-xs text-amber-800"
				>
					<span>No pudimos actualizar las sucursales.</span>
					<Button
						variant="link"
						size="sm"
						className="h-auto p-0 text-xs"
						onClick={() => branchesQuery.refetch()}
					>
						Reintentar
					</Button>
				</div>
			) : null}
		</div>
	);
}

function ReportYearPicker({
	id,
	year,
	onChange,
}: {
	id: string;
	year: number;
	onChange: (year: number) => void;
}) {
	const [open, setOpen] = useState(false);
	const [draft, setDraft] = useState(String(year));
	const parsed = ReportQuerySchema.shape.year.safeParse(draft);
	const selectedYear = parsed.success ? parsed.data : year;
	return (
		<Popover
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (nextOpen) setDraft(String(year));
			}}
		>
			<PopoverTrigger
				render={
					<Button
						id={id}
						aria-label={`Año: ${year}`}
						variant="outline"
						className={controlClass}
					>
						<span>{year}</span>
						<ChevronDown className="size-4 text-muted-foreground" />
					</Button>
				}
			/>
			<PopoverContent align="start" className="w-64 p-3">
				<form
					className="space-y-3"
					onSubmit={(event) => {
						event.preventDefault();
						if (parsed.success) {
							onChange(parsed.data);
							setOpen(false);
						}
					}}
				>
					<label
						htmlFor={`${id}-input`}
						className="text-xs font-medium text-muted-foreground"
					>
						Año del reporte
					</label>
					<div className="flex items-center gap-2">
						<Button
							variant="ghost"
							size="icon"
							type="button"
							aria-label="Año anterior"
							disabled={selectedYear <= 1}
							onClick={() => setDraft(String(selectedYear - 1))}
						>
							<ChevronLeft className="size-4" />
						</Button>
						<Input
							id={`${id}-input`}
							type="number"
							min={1}
							max={9998}
							step={1}
							required
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							className="text-center tabular-nums"
						/>
						<Button
							variant="ghost"
							size="icon"
							type="button"
							aria-label="Año siguiente"
							disabled={selectedYear >= 9998}
							onClick={() => setDraft(String(selectedYear + 1))}
						>
							<ChevronRight className="size-4" />
						</Button>
					</div>
					<Button
						type="submit"
						size="sm"
						className="w-full"
						disabled={!parsed.success}
					>
						Aplicar año
					</Button>
				</form>
			</PopoverContent>
		</Popover>
	);
}
