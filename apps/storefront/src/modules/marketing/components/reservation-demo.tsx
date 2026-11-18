import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
import { ArrowRight, RotateCcw } from "lucide-react";
import { type ReactNode, useState } from "react";
import {
	type DemoPeriod,
	demoPeriodsOverlap,
	getDemoCalendar,
} from "../reservation-demo";

function DemoPanel({
	title,
	caption,
	children,
}: {
	title: string;
	caption: string;
	children: ReactNode;
}) {
	return (
		<div className="min-w-0 overflow-hidden rounded-xl border bg-card shadow-[0_4px_18px_rgba(18,36,70,0.015)]">
			<div className="flex h-[57px] items-center justify-between gap-2 border-b border-[#eef0f5] px-[21px] text-xs">
				<strong className="font-bold">{title}</strong>
				<span className="text-muted-foreground">{caption}</span>
			</div>
			<div className="p-4 min-[821px]:p-[21px]">{children}</div>
		</div>
	);
}

const calendarDays = Array.from({ length: 11 }, (_, i) => i + 5);

export function ReservationDemo({ month }: { month: string }) {
	const { periods, monthLabel, year } = getDemoCalendar(month);
	const [selected, setSelected] = useState(0);
	const [bookings, setBookings] = useState<DemoPeriod[]>([]);
	const period = periods[selected];
	const available = !bookings.some((booking) =>
		demoPeriodsOverlap(period, booking),
	);

	function book() {
		setBookings((current) =>
			current.some((booking) => demoPeriodsOverlap(period, booking))
				? current
				: [...current, period],
		);
	}

	return (
		<>
			<div className="mb-3 flex justify-end">
				<Button
					variant="ghost"
					size="sm"
					className="h-7 gap-1.5 text-xs font-normal text-muted-foreground hover:text-primary"
					onClick={() => {
						setBookings([]);
						setSelected(0);
					}}
				>
					<RotateCcw className="size-3" aria-hidden="true" />
					Reiniciar demostración
				</Button>
			</div>
			<div className="grid gap-[18px] min-[641px]:grid-cols-2">
				<DemoPanel title="Catálogo online" caption="Vista del cliente">
					<div className="mb-4 flex h-[167px] items-center justify-center rounded-[9px] border border-[#f0f1f5] bg-[#f8f9fc]">
						<img
							src="/marketing/camera.svg"
							alt="Cámara profesional"
							width={220}
							height={150}
							className="h-[125px] w-auto max-w-4/5 drop-shadow-[0_9px_8px_rgba(39,52,73,0.13)]"
						/>
					</div>
					<h3 className="mb-[3px] text-[17px] font-bold">Cámara Sony FX6</h3>
					<p className="text-xs text-muted-foreground">
						Cámara profesional · Alquiler por día
					</p>
					<p className="mb-2.5 mt-[27px] text-xs font-bold">
						¿Cuándo la necesitás?
					</p>
					<fieldset
						aria-label="Elegir fechas de alquiler"
						className="grid grid-cols-3 gap-[7px]"
					>
						{periods.map((choice, index) => (
							<Button
								key={choice.start}
								variant="outline"
								aria-pressed={selected === index}
								onClick={() => setSelected(index)}
								className="h-auto min-w-0 rounded-[7px] border-[#e0e7f0] px-1 py-3 text-xs font-normal text-[#5c6b80] shadow-none aria-pressed:border-primary aria-pressed:bg-[#eef4ff] aria-pressed:font-bold aria-pressed:text-primary max-[360px]:text-[10px]"
							>
								{choice.label}
							</Button>
						))}
					</fieldset>
					<div
						aria-live="polite"
						aria-atomic="true"
						className={cn(
							"flex min-h-[42px] items-center gap-2 text-xs font-semibold",
							available ? "text-[#27805e]" : "text-[#ae503e]",
						)}
					>
						<span
							aria-hidden="true"
							className={cn(
								"size-2 shrink-0 rounded-full",
								available ? "bg-[#23a16d]" : "bg-[#d66a52]",
							)}
						/>
						{available
							? "Disponible para estas fechas"
							: "No disponible para estas fechas"}
					</div>
					<Button
						disabled={!available}
						onClick={book}
						className="h-auto w-full gap-[11px] rounded-lg py-[13px] font-bold hover:bg-[#0b48c6] disabled:bg-[#e8edf4] disabled:text-[#657387] disabled:opacity-100"
					>
						{available ? "Confirmar reserva" : "Elegí otras fechas"}
						{available && <ArrowRight aria-hidden="true" />}
					</Button>
				</DemoPanel>
				<DemoPanel title="Panel del negocio" caption="Vista del propietario">
					<div className="mb-[15px] flex items-center justify-between gap-2 text-xs">
						<strong className="font-bold">Disponibilidad · {monthLabel}</strong>
						<span className="shrink-0 text-muted-foreground">1 equipo</span>
					</div>
					<div className="overflow-x-auto rounded-[7px] border">
						<table className="w-full table-fixed border-collapse text-xs">
							<caption className="sr-only">
								Calendario de disponibilidad · {monthLabel}
							</caption>
							<thead>
								<tr className="border-b bg-[#fafbfd] text-muted-foreground">
									<th
										scope="col"
										className="w-[72px] py-3 pl-2.5 text-left font-normal min-[821px]:w-[86px]"
									>
										Equipo
									</th>
									{calendarDays.map((day) => (
										<th
											key={day}
											scope="col"
											className="py-3 text-center font-normal max-[360px]:text-[10px]"
										>
											{day}
										</th>
									))}
								</tr>
							</thead>
							<tbody>
								<tr>
									<th
										scope="row"
										className="border-r px-[7px] py-[13px] text-left align-top font-normal"
									>
										Sony FX6
										<span className="block text-[10px] text-muted-foreground">
											1 unidad
										</span>
									</th>
									{calendarDays.map((day) => {
										const booking = bookings.find(
											(b) => day >= b.start && day <= b.end,
										);
										return (
											<td
												key={day}
												className="h-[67px] border-r border-[#edf1f5] p-0 last:border-r-0"
											>
												<div
													className={cn(
														"h-[67px]",
														booking &&
															"border-y-2 border-[#4483fa] bg-[#dceaff]",
														booking?.start === day &&
															"rounded-l-[5px] border-l-2",
														booking?.end === day &&
															"rounded-r-[5px] border-r-2",
													)}
													title={`${day}: ${booking ? "Reservado" : "Libre"}`}
												>
													<span className="sr-only">
														{booking ? "Reservado" : "Libre"}
													</span>
												</div>
											</td>
										);
									})}
								</tr>
							</tbody>
						</table>
					</div>
					<h3 className="mb-3 mt-7 text-xs font-bold">
						Alquileres confirmados
					</h3>
					<div aria-live="polite" aria-atomic="true">
						{bookings.length === 0 ? (
							<p className="rounded-lg border border-dashed px-2.5 py-[31px] text-center text-[11px] text-muted-foreground">
								Todavía no hay reservas para este equipo.
							</p>
						) : (
							bookings.map((booking, index) => (
								<div
									key={booking.start}
									className="mb-2 flex items-center justify-between gap-3 rounded-lg border p-[13px]"
								>
									<div>
										<strong className="block text-xs font-bold">
											Alquiler #{String(index + 1).padStart(3, "0")}
										</strong>
										<p className="mt-[3px] text-xs text-muted-foreground">
											Cámara Sony FX6 · {booking.label} {year}
										</p>
									</div>
									<span className="rounded-full bg-[#ebf8f0] px-2 py-1 text-[10px] font-semibold text-[#247f57]">
										Confirmado
									</span>
								</div>
							))
						)}
					</div>
				</DemoPanel>
			</div>
		</>
	);
}
