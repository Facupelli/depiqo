import { CalendarDays, Clock } from "lucide-react";
import { useStorefrontBranchScheduleSlots } from "@/modules/tenant-management/branches/branch-schedule.queries";
import { useCartPeriodContext } from "../cart-page.context";

export function CartPagePeriod() {
	const {
		branch,
		periodStart,
		periodEnd,
		pickupTime,
		returnTime,
		setPickupTime,
		setReturnTime,
		isPeriodInvalid,
	} = useCartPeriodContext();
	const { data: slots, isLoading } = useStorefrontBranchScheduleSlots(
		branch.id,
		{ periodStart, periodEnd },
	);

	return (
		<div className="space-y-3">
			<section className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 lg:grid-cols-4">
				<InfoCell label="Período" icon={<CalendarDays />}>
					<strong>
						{periodStart} - {periodEnd}
					</strong>
				</InfoCell>
				<InfoCell label="Sucursal">
					<strong>{branch.name}</strong>
				</InfoCell>
				<TimeCell
					label="Hora de retiro"
					value={pickupTime}
					slots={slots?.pickupSlots}
					loading={isLoading}
					onChange={setPickupTime}
				/>
				<TimeCell
					label="Hora de devolución"
					value={returnTime}
					slots={slots?.returnSlots}
					loading={isLoading}
					onChange={setReturnTime}
				/>
			</section>
			{isPeriodInvalid && (
				<p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					La devolución debe ser posterior al retiro.
				</p>
			)}
		</div>
	);
}

function InfoCell({
	label,
	icon,
	children,
}: {
	label: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="border-b p-4 last:border-b-0 sm:border-r lg:border-b-0">
			<p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
				{icon && <span className="[&_svg]:size-3.5">{icon}</span>}
				{label}
			</p>
			<div className="text-sm">{children}</div>
		</div>
	);
}

function TimeCell({
	label,
	value,
	slots,
	loading,
	onChange,
}: {
	label: string;
	value?: number;
	slots?: number[];
	loading: boolean;
	onChange: (value: number) => void;
}) {
	return (
		<InfoCell label={label} icon={<Clock />}>
			{!loading && slots?.length === 0 ? (
				<span className="text-amber-700">Sin horarios disponibles</span>
			) : (
				<select
					className="w-full bg-transparent font-semibold outline-none"
					disabled={loading}
					value={value ?? ""}
					onChange={(event) => onChange(Number(event.target.value))}
				>
					<option value="" disabled>
						{loading ? "Cargando..." : "Seleccionar"}
					</option>
					{slots?.map((slot) => (
						<option key={slot} value={slot}>
							{formatMinutes(slot)}
						</option>
					))}
				</select>
			)}
		</InfoCell>
	);
}

const formatMinutes = (minutes: number) =>
	new Intl.DateTimeFormat("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60));
