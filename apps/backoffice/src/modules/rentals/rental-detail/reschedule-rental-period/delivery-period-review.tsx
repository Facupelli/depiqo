import type {
	AcceptedDeliveryDto,
	PreviewConfirmedRentalPeriodResponseDto,
} from "@repo/api-contracts";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";
import { useId } from "react";
import { formatMoney } from "@/shared/utils/formatters";

type Preview = PreviewConfirmedRentalPeriodResponseDto;

const restrictionLabels: Record<
	NonNullable<Preview["delivery"]>["policyRestrictions"][number],
	string
> = {
	NOT_CONFIGURED: "El servicio de envío no está configurado.",
	DISABLED: "El servicio de envío está deshabilitado.",
	BEYOND_MAX_DISTANCE: "La dirección supera la distancia máxima de envío.",
	DELIVERY_OUTSIDE_SERVICE_HOURS:
		"La entrega está fuera del horario de servicio.",
	COLLECTION_OUTSIDE_SERVICE_HOURS:
		"El retiro está fuera del horario de servicio.",
};

const blockerLabels = {
	TRANSPORT_RESERVATION_MINUTES_REQUIRED:
		"Falta definir el tiempo para transporte. Completalo antes de reprogramar.",
	STAFF_AGREEMENT_REQUIRED:
		"Falta definir el importe de entrega y retiro. Completalo en Editar precio de entrega y retiro antes de reprogramar.",
	CURRENCY_MISMATCH:
		"La moneda del envío no coincide con la del alquiler. Revisá el importe de entrega y retiro antes de reprogramar.",
	AUTOMATIC_QUOTE_OR_POLICY_RESTRICTION_REQUIRED:
		"No pudimos evaluar el envío. Revisá la configuración de la sucursal y volvé a intentar.",
} satisfies Partial<Record<Preview["requirements"][number], string>>;

export function deliveryReviewBlockers(preview: Preview): string[] {
	return preview.requirements.flatMap((requirement) =>
		requirement in blockerLabels
			? [blockerLabels[requirement as keyof typeof blockerLabels]]
			: [],
	);
}

export function needsPolicyAuthorization(preview: Preview) {
	return Boolean(
		preview.delivery?.requiresExceptionAuthorization ||
			preview.requirements.includes("POLICY_EXCEPTION_AUTHORIZATION_REQUIRED"),
	);
}

export function needsMinuteAcceptance(preview: Preview) {
	return Boolean(
		preview.delivery?.requiresExplicitMinuteAcceptance ||
			preview.requirements.includes(
				"REUSED_TRANSPORT_RESERVATION_MINUTES_ACCEPTANCE_REQUIRED",
			),
	);
}

export function DeliveryPeriodReview({
	arrangement,
	preview,
	canAuthorize,
	authorized,
	reason,
	minutesAccepted,
	disabled,
	onAuthorizedChange,
	onReasonChange,
	onMinutesAcceptedChange,
}: {
	arrangement: AcceptedDeliveryDto["arrangement"] | null;
	preview: Preview;
	canAuthorize: boolean;
	authorized: boolean;
	reason: string;
	minutesAccepted: boolean;
	disabled: boolean;
	onAuthorizedChange: (value: boolean) => void;
	onReasonChange: (value: string) => void;
	onMinutesAcceptedChange: (value: boolean) => void;
}) {
	const exceptionId = useId();
	const minutesId = useId();
	const reasonId = useId();
	const delivery = preview.delivery;
	if (!delivery) return null;
	const manual = delivery.currentPricingSource === "STAFF_AGREEMENT";
	const difference = delivery.effectiveChargeDifference;
	const unchanged =
		difference !== null && /^[-+]?0+(?:\.0+)?$/.test(difference);
	const money = (amount: string | null, currency = preview.currency) =>
		amount === null ? "No disponible" : formatMoney(amount, currency);
	const blockers = deliveryReviewBlockers(preview);

	if (arrangement === "STAFF_ARRANGED") {
		return (
			<section
				className="mt-5 space-y-3 border-t border-neutral-200 pt-4 text-sm"
				aria-label="Envío a medida"
				aria-live="polite"
			>
				<h3 className="font-medium">Envío a medida</h3>
				<dl className="space-y-2">
					<MoneyRow
						label="Entrega y retiro · Importe actual"
						value={money(delivery.currentEffectiveCharge)}
					/>
					<MoneyRow
						label="Total del alquiler"
						value={money(preview.proposedAcceptedCustomerTotal)}
					/>
				</dl>
				<p className="text-muted-foreground">
					Se mantienen el destino, el importe y el tiempo para transporte. Solo
					cambian las fechas de entrega y retiro.
				</p>
				<p className="text-muted-foreground">
					Tiempo para transporte: {delivery.transportReservationMinutes}{" "}
					minutos, sin cambios.
				</p>
				{blockers.map((message) => (
					<p key={message} className="text-destructive" role="alert">
						{message}
					</p>
				))}
				{!preview.reviewIdentity ||
				!delivery.staffAgreementPreserved ||
				delivery.proposedEffectiveCharge === null ||
				preview.proposedAcceptedCustomerTotal === null ? (
					<p className="text-destructive" role="alert">
						No pudimos verificar las condiciones actuales del envío. Volvé a
						revisar antes de guardar.
					</p>
				) : null}
			</section>
		);
	}

	return (
		<section
			className="mt-5 space-y-4 border-t border-neutral-200 pt-4"
			aria-label="Revisión de entrega y retiro"
			aria-live="polite"
		>
			<h3 className="font-medium text-sm">Cambios en entrega y retiro</h3>
			<dl className="space-y-2 text-sm">
				<MoneyRow
					label={manual ? "Importe definido actual" : "Precio calculado actual"}
					value={money(delivery.currentEffectiveCharge)}
				/>
				{manual && delivery.proposedCalculatedReference ? (
					<MoneyRow
						label="Precio calculado de referencia"
						value={money(
							delivery.proposedCalculatedReference.total,
							delivery.proposedCalculatedReference.currency,
						)}
					/>
				) : null}
				<MoneyRow
					label="Entrega y retiro · Importe propuesto"
					value={money(delivery.proposedEffectiveCharge)}
				/>
				{!manual ? (
					<MoneyRow
						label="Diferencia"
						value={
							difference !== null && !unchanged && !difference.startsWith("-")
								? `+${money(difference)}`
								: money(difference)
						}
						emphasized={difference !== null && !unchanged}
					/>
				) : null}
				<div className="border-t border-neutral-200 pt-2 font-semibold">
					<MoneyRow
						label={
							manual ? "Total del alquiler" : "Total propuesto del alquiler"
						}
						value={money(preview.proposedAcceptedCustomerTotal)}
					/>
				</div>
			</dl>
			<p className="text-muted-foreground text-sm">
				{manual && delivery.staffAgreementPreserved
					? "El importe definido se mantiene al reprogramar."
					: !manual && unchanged
						? "El importe de entrega y retiro se mantiene sin cambios."
						: !manual
							? "Al guardar, se aplicará el importe de entrega y retiro mostrado."
							: "No pudimos verificar que se mantenga el importe actual. Volvé a revisar antes de guardar."}
			</p>
			{delivery.policyRestrictions.length > 0 ? (
				<div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-950 text-sm">
					<p className="font-medium">Restricciones para las nuevas fechas</p>
					<ul className="mt-1 list-disc space-y-1 pl-4">
						{delivery.policyRestrictions.map((code) => (
							<li key={code}>{restrictionLabels[code]}</li>
						))}
					</ul>
				</div>
			) : null}
			{needsPolicyAuthorization(preview) ? (
				<div className="space-y-3 text-sm">
					{canAuthorize ? (
						<>
							<label htmlFor={exceptionId} className="flex items-start gap-2">
								<Checkbox
									id={exceptionId}
									checked={authorized}
									disabled={disabled}
									onCheckedChange={(checked) =>
										onAuthorizedChange(checked === true)
									}
								/>
								<span>
									Autorizar una excepción a las condiciones de envío para las
									nuevas fechas
								</span>
							</label>
							{authorized ? (
								<Field>
									<FieldLabel htmlFor={reasonId}>
										Motivo de la excepción (opcional)
									</FieldLabel>
									<Textarea
										id={reasonId}
										value={reason}
										disabled={disabled}
										onChange={(event) => onReasonChange(event.target.value)}
									/>
								</Field>
							) : null}
						</>
					) : (
						<p className="text-destructive">
							Necesitás permiso para autorizar esta excepción. No podés guardar
							estos cambios.
						</p>
					)}
				</div>
			) : null}
			{delivery.transportReservationMinutes !== null ? (
				<p className="text-muted-foreground text-sm">
					Tiempo para transporte:{" "}
					<span className="font-medium tabular-nums">
						{delivery.transportReservationMinutes} minutos
					</span>
					.
				</p>
			) : null}
			{needsMinuteAcceptance(preview) &&
			delivery.transportReservationMinutes === null ? (
				<p className="text-destructive text-sm">
					No pudimos obtener el tiempo para transporte. Volvé a revisar antes de
					guardar.
				</p>
			) : null}
			{needsMinuteAcceptance(preview) &&
			delivery.transportReservationMinutes !== null ? (
				<label htmlFor={minutesId} className="flex items-start gap-2 text-sm">
					<Checkbox
						id={minutesId}
						checked={minutesAccepted}
						disabled={disabled}
						onCheckedChange={(checked) =>
							onMinutesAcceptedChange(checked === true)
						}
					/>
					<span>
						Mantener el tiempo actual para transporte:{" "}
						{delivery.transportReservationMinutes} min
					</span>
				</label>
			) : null}
			{blockers.length > 0 ? (
				<ul className="space-y-2 text-destructive text-sm" role="alert">
					{blockers.map((message) => (
						<li key={message}>{message}</li>
					))}
				</ul>
			) : null}
			{!preview.reviewIdentity ||
			delivery.proposedEffectiveCharge === null ||
			preview.proposedAcceptedCustomerTotal === null ? (
				<p className="text-destructive text-sm">
					Falta completar las condiciones de envío. Revisá los avisos y volvé a
					revisar los cambios antes de guardar.
				</p>
			) : null}
		</section>
	);
}

function MoneyRow({
	label,
	value,
	emphasized = false,
}: {
	label: string;
	value: string;
	emphasized?: boolean;
}) {
	return (
		<div
			className={`flex items-baseline justify-between gap-4 ${emphasized ? "rounded bg-amber-50 p-2 font-semibold text-amber-950" : ""}`}
		>
			<dt className="min-w-0 text-muted-foreground">{label}</dt>
			<dd className="shrink-0 text-right tabular-nums">{value}</dd>
		</div>
	);
}
