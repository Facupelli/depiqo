import type { BranchScheduleSlotDto } from "@repo/api-contracts";
import { Clock } from "lucide-react";
import { dateParamToLocalDate } from "@/lib/dates/parse";
import { useCartPeriodContext } from "../cart-page.context";

export function CartPagePeriod() {
	const {
		branch,
		periodStart,
		periodEnd,
		pickupSlot,
		returnSlot,
		setPickupSlot,
		setReturnSlot,
		pickupSlots,
		returnSlots,
		areSlotsLoading,
		isPeriodInvalid,
	} = useCartPeriodContext();

	return (
		<div className="space-y-3">
			<section className="grid overflow-hidden rounded-xl border bg-card md:grid-cols-3">
				<InfoCell label="Sucursal">
					<strong>{branch.name}</strong>
				</InfoCell>
				<TimeCell
					label="Retiro"
					date={periodStart}
					value={pickupSlot}
					slots={pickupSlots}
					loading={areSlotsLoading}
					onChange={setPickupSlot}
				/>
				<TimeCell
					label="Devolución"
					date={periodEnd}
					value={returnSlot}
					slots={returnSlots}
					loading={areSlotsLoading}
					onChange={setReturnSlot}
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
		<div className="border-b p-4 last:border-b-0 md:border-r md:border-b-0 md:last:border-r-0">
			<p className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase text-muted-foreground">
				{icon && <span className="[&_svg]:size-3.5">{icon}</span>}
				{label}
			</p>
			<div className="text-sm">{children}</div>
		</div>
	);
}

function TimeCell({
	label,
	date,
	value,
	slots,
	loading,
	onChange,
}: {
	label: string;
	date: string;
	value?: BranchScheduleSlotDto;
	slots?: BranchScheduleSlotDto[];
	loading: boolean;
	onChange: (value: BranchScheduleSlotDto) => void;
}) {
	return (
		<InfoCell label={label} icon={<Clock />}>
			<div className="space-y-2 md:flex md:items-center md:gap-3 md:space-y-0">
				<p className="shrink-0 whitespace-nowrap font-medium capitalize">
					{formatLocalDate(date)}
				</p>
				{!loading && slots?.length === 0 ? (
					<span className="text-amber-700">Sin horarios disponibles</span>
				) : (
					<select
						className="min-w-0 w-full bg-transparent font-semibold outline-none"
						disabled={loading}
						value={value?.instant ?? ""}
						onChange={(event) => {
							const slot = slots?.find(
								(candidate) => candidate.instant === event.target.value,
							);
							if (slot) onChange(slot);
						}}
					>
						<option value="" disabled>
							{loading ? "Cargando..." : "Seleccionar"}
						</option>
						{slots?.map((slot) => (
							<option key={slot.instant} value={slot.instant}>
								{formatMinutes(slot.minuteOfDay)}
							</option>
						))}
					</select>
				)}
			</div>
		</InfoCell>
	);
}

const formatLocalDate = (date: string) =>
	new Intl.DateTimeFormat("es-AR", {
		weekday: "short",
		day: "numeric",
		month: "short",
	}).format(dateParamToLocalDate(date));

const formatMinutes = (minutes: number) =>
	new Intl.DateTimeFormat("es-AR", {
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60));
