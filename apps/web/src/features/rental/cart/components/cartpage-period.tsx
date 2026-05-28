import type { Dayjs } from "dayjs";
import { AlertTriangle, Calendar, Clock } from "lucide-react";
import {
	formatDailyRange,
	formatDateShort,
	formatRentalDuration,
} from "@/lib/dates/format";
import { useStorefrontBranchScheduleSlots } from "@/v2/features/tenant-management/branch/branch.queries";
import { formatSlot } from "../cart.utils";
import {
	useCartContext,
	useCartLocationContext,
	useCartPricingContext,
	useCartTimesContext,
} from "../cart-page.context";

export function CartPagePeriod() {
	const { period, locationId, locationName } = useCartLocationContext();

	const scheduleSlotsQuery = {
		periodStart: period.start.format("YYYY-MM-DD"),
		periodEnd: period.end.format("YYYY-MM-DD"),
	};

	const { data: slots, isLoading } = useStorefrontBranchScheduleSlots(
		locationId,
		scheduleSlotsQuery,
	);

	const { cartItems } = useCartContext();
	const { preview } = useCartPricingContext();
	const {
		isTimesRequired,
		onPickupTimeChange,
		onReturnTimeChange,
		pickupTime,
		returnTime,
	} = useCartTimesContext();

	const startDate = period.start;
	const endDate = period.end;
	const durationLabel = formatCartDuration(
		preview?.chargedDays,
		cartItems[0]?.pricing?.ratePlan.billingUnit,
		startDate,
		endDate,
	);

	if (!startDate || !endDate) {
		return (
			<div className="mb-8">
				<p className="mb-4 text-xs font-bold uppercase tracking-widest text-black">
					Periodo de Alquiler
				</p>
				<div className="flex items-center gap-3 rounded-none border border-amber-200 bg-amber-50 px-4 py-3">
					<AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
					<p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
						No seleccionaste el periodo de alquiler — va a atrás para configurar
						tus fechas antes de reservar.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/*
        Mobile:  2-column grid — cells pair up naturally:
                 [Rental Period | Location]
                 [Pickup Time   | Return Time]
                 [Duration      | — ]
        Desktop: single-row 5-column strip with dividers, unchanged.
      */}
			<div className="border border-neutral-200 bg-white">
				{/* ── Desktop layout: 5-col strip ── */}
				<div className="hidden md:grid md:grid-cols-5 md:divide-x md:divide-neutral-200 py-4">
					<PeriodCell
						label="Periodo de Alquiler"
						icon={<Calendar className="h-4 w-4 shrink-0 text-neutral-400" />}
					>
						<p className="text-sm font-semibold text-black">
							{formatDailyRange(startDate, endDate)}
						</p>
					</PeriodCell>

					<TimeSelectCell
						label="Hora de Retiro"
						slots={slots?.pickupSlots}
						isLoading={isLoading}
						value={pickupTime}
						onChange={onPickupTimeChange}
					/>

					<TimeSelectCell
						label="Hora de Devolución"
						slots={slots?.returnSlots}
						isLoading={isLoading}
						value={returnTime}
						onChange={onReturnTimeChange}
					/>

					<PeriodCell
						label="Duración Total"
						icon={<Clock className="h-4 w-4 shrink-0 text-neutral-400" />}
					>
						<p className="text-sm font-semibold text-black">{durationLabel}</p>
					</PeriodCell>

					<PeriodCell label="Retiro Por">
						{locationName ? (
							<p className="text-sm font-semibold text-black">{locationName}</p>
						) : (
							<p className="text-sm text-neutral-300">No seleccionado</p>
						)}
					</PeriodCell>
				</div>

				{/* ── Mobile layout: 2-col grid ── */}
				<div className="md:hidden grid grid-cols-2 divide-y divide-neutral-200">
					<div className="col-span-2 border-t border-neutral-200">
						<PeriodCell
							label="Periodo de Alquiler"
							icon={<Calendar className="size-3.5 shrink-0 text-neutral-400" />}
						>
							<div className="flex items-center gap-2">
								<p className="text-sm font-semibold text-black">
									{formatDateShort(startDate)}
								</p>
								<span> - </span>
								<p className="text-sm font-semibold text-black">
									{formatDateShort(endDate)}
								</p>
							</div>
						</PeriodCell>
					</div>
					{/* Row 1 */}
					<div className="divide-x divide-neutral-200 contents">
						<PeriodCell label="Retiro Por">
							{locationName ? (
								<p className="text-sm font-semibold text-black leading-tight">
									{locationName}
								</p>
							) : (
								<p className="text-sm text-neutral-300">No seleccionado</p>
							)}
						</PeriodCell>

						<PeriodCell
							label="Duración Total"
							icon={<Clock className="h-3.5 w-3.5 shrink-0 text-neutral-400" />}
						>
							<p className="text-sm font-semibold text-black">
								{durationLabel}
							</p>
						</PeriodCell>
					</div>

					{/* Row 2 */}
					<div className="col-span-2 grid grid-cols-2 divide-x divide-neutral-200 border-t border-neutral-200">
						<TimeSelectCell
							label="Hora de Retiro"
							slots={slots?.pickupSlots}
							isLoading={isLoading}
							value={pickupTime}
							onChange={onPickupTimeChange}
						/>
						<TimeSelectCell
							label="Hora de Devolución"
							slots={slots?.returnSlots}
							isLoading={isLoading}
							value={returnTime}
							onChange={onReturnTimeChange}
						/>
					</div>

					{/* Row 3 — Duration, spans full width */}
				</div>
			</div>

			{isTimesRequired && (
				<div className="flex items-center gap-3 border border-amber-200 bg-amber-50 px-4 py-3">
					<AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
					<p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
						Por favor, selecciona una hora de retiro y una hora de devolución
						antes de alquilar.
					</p>
				</div>
			)}
		</div>
	);
}

function formatCartDuration(
	totalUnits: number | undefined,
	billingUnitLabel: string | undefined,
	start: Dayjs,
	end: Dayjs,
): string {
	if (totalUnits === undefined || !billingUnitLabel) {
		return formatRentalDuration(start, end);
	}

	const normalizedLabel = billingUnitLabel.trim().toLowerCase();

	if (normalizedLabel === "day") {
		return `${totalUnits} ${totalUnits === 1 ? "Día" : "Días"}`;
	}

	if (normalizedLabel === "hour") {
		return `${totalUnits} ${totalUnits === 1 ? "Hora" : "Horas"}`;
	}

	return `${totalUnits} ${billingUnitLabel}`;
}

function PeriodCell({
	label,
	icon,
	children,
}: {
	label: string;
	icon?: React.ReactNode;
	children: React.ReactNode;
}) {
	return (
		<div className="px-4 py-3 md:px-5 md:py-0">
			<p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400 mb-1 md:mb-0">
				{label}
			</p>
			<div className="flex items-center gap-1.5 pt-0 md:items-center md:gap-2 md:pt-1">
				{icon && <span className="mt-0.5 md:mt-0">{icon}</span>}
				<div className="flex flex-col gap-0.5 md:contents">{children}</div>
			</div>
		</div>
	);
}

type TimeSelectCellProps = {
	label: string;
	slots: number[] | undefined;
	value: number | undefined;
	isLoading: boolean;
	onChange: (value: number) => void;
};

export function TimeSelectCell({
	label,
	value,
	onChange,
	slots,
	isLoading,
}: TimeSelectCellProps) {
	const isClosed = !isLoading && (!slots || slots.length === 0);

	return (
		<PeriodCell
			label={label}
			icon={<Clock className="h-4 w-4 shrink-0 text-neutral-400" />}
		>
			{isClosed ? (
				<div className="flex items-center gap-1.5 rounded border border-amber-200 bg-amber-50 px-2 py-1">
					<AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
					<p className="text-[10px] font-semibold uppercase tracking-wider text-amber-700">
						Closed
					</p>
				</div>
			) : (
				<select
					disabled={isLoading}
					value={value ?? ""}
					onChange={(e) => onChange(Number(e.target.value))}
					className="w-full bg-transparent text-sm font-semibold text-black focus:outline-none disabled:text-neutral-300"
				>
					<option value="" disabled>
						{isLoading ? "Cargando…" : "Seleccionar"}
					</option>
					{(slots ?? []).map((slot) => (
						<option key={slot} value={slot}>
							{formatSlot(slot)}
						</option>
					))}
				</select>
			)}
		</PeriodCell>
	);
}
