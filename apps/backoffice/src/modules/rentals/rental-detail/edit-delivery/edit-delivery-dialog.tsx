import {
	type ChangeConfirmedRentalDeliveryBodyDto,
	TenantPermission,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import {
	Check,
	Clock3,
	Coins,
	Handshake,
	MapPin,
	Pencil,
	ShieldCheck,
	Truck,
} from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { toast } from "sonner";
import { can } from "@/auth/permissions";
import { DeliveryAddressAutocomplete } from "@/modules/rentals/draft-rental-composer/components/delivery-address-autocomplete";
import { deliveryRestrictionLabels } from "@/modules/rentals/draft-rental-composer/delivery-preview";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import { useAppForm } from "@/shared/contexts/form.context";
import { formatMoney } from "@/shared/utils/formatters";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import { useRentalDetailContext } from "../rental-detail.context";
import { toEditDeliveryError } from "./edit-delivery.errors";
import { useEditDelivery } from "./edit-delivery.mutation";
import {
	canRequestAutomaticDeliveryPrice,
	createDeliveryFormSchema,
	type DeliveryRental,
	deliveryChanges,
	deliveryDefaults,
} from "./edit-delivery.schema";

export function EditDeliveryDialog({ onClose }: { onClose: () => void }) {
	const { rental: currentRental, permissions } = useRentalDetailContext();
	// Keep accepted facts and their concurrency token together for this session.
	const [rental] = useState(() => currentRental);
	const delivery = rental.acceptedDelivery;
	const mutation = useEditDelivery();
	const queryClient = useQueryClient();
	const id = useId();
	const [error, setError] = useState<ReturnType<
		typeof toEditDeliveryError
	> | null>(null);
	const [review, setReview] =
		useState<ChangeConfirmedRentalDeliveryBodyDto | null>(null);
	const schema = createDeliveryFormSchema(rental);
	const authorized = can(permissions, TenantPermission.RentalsDeliveryManage);
	const form = useAppForm({
		defaultValues: deliveryDefaults(rental),
		validators: { onChange: schema, onSubmit: schema },
		onSubmit: async ({ value }) => {
			if (mutation.isPending || error?.stale || error?.blocked || !authorized)
				return;
			if (Date.now() >= Date.parse(rental.period.start)) {
				setError({
					message:
						"Ya se alcanzó el inicio programado. No se pueden cambiar las condiciones de entrega.",
					stale: false,
					blocked: true,
				});
				return;
			}
			const body = deliveryChanges(schema.parse(value), rental);
			if (!body) return;
			if (!review) {
				setReview(body);
				setError(null);
				return;
			}
			setError(null);
			try {
				await mutation.mutateAsync({ rentalId: rental.id, ...review });
				onClose();
				toast.success("Condiciones de entrega actualizadas");
			} catch (cause) {
				const next = toEditDeliveryError(cause);
				setError(next);
				setReview(null);
				if (next.stale)
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: rentalKeys.all() }),
						queryClient.invalidateQueries({
							queryKey: contractKeys.rentalSigningSummary(rental.id),
						}),
					]);
			}
		},
	});
	const values = useStore(form.store, (state) => state.values);
	const submitting = useStore(form.store, (state) => state.isSubmitting);
	const valid = schema.safeParse(values).success;
	const changed = valid && deliveryChanges(values, rental) !== null;
	const pending = mutation.isPending || submitting;
	const locked =
		pending || Boolean(error?.stale || error?.blocked) || !authorized;
	const transition = values.arrangement !== delivery?.arrangement;
	const staff = values.arrangement === "STAFF_ARRANGED";
	if (
		!delivery ||
		!authorized ||
		rental.status !== "CONFIRMED" ||
		rental.fulfillment.method !== "DELIVERY"
	)
		return null;

	const currentAddress =
		rental.fulfillment.deliveryDetails?.formattedAddress ??
		rental.fulfillment.deliveryDetails?.address;
	const proposedAddress =
		transition || values.changeAddress ? values.address : currentAddress;
	const automaticReevaluation =
		!staff &&
		(transition ||
			values.changeAddress ||
			values.authorizeException ||
			(values.changeMinutes &&
				Number(values.minutes) !== delivery.transportReservationMinutes));
	const priceSummary =
		values.pricing === "SET"
			? values.amount && /^\d+(\.\d{1,2})?$/.test(values.amount.trim())
				? formatMoney(values.amount, delivery.currency)
				: "Ingresá un importe"
			: values.pricing === "CLEAR" ||
					(automaticReevaluation && !delivery.staffAgreement)
				? "Precio automático por calcular"
				: formatMoney(delivery.effectiveDeliveryCharge, delivery.currency);
	const priceDetail =
		values.pricing === "SET"
			? "Nuevo importe acordado"
			: values.pricing === "KEEP" && delivery.staffAgreement
				? "Importe acordado"
				: "Según dirección, ruta y configuración de la sucursal";
	const minutesSummary = values.changeMinutes
		? values.minutes.trim()
			? `${values.minutes} minutos`
			: "Ingresá los minutos"
		: transition
			? "Según configuración de la sucursal"
			: `${delivery.transportReservationMinutes} minutos`;

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !pending) onClose();
			}}
			disablePointerDismissal={pending}
		>
			<DialogContent
				className="flex max-h-[calc(100dvh-2rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
				showCloseButton={!pending}
			>
				<DialogHeader className="shrink-0 px-6 pt-6 pb-4 pr-12">
					<DialogTitle className="text-xl font-semibold">
						{review ? "Revisar cambios de entrega" : "Editar entrega"}
					</DialogTitle>
					<DialogDescription>
						Modificá las condiciones de entrega de este alquiler.
					</DialogDescription>
				</DialogHeader>
				<div className="min-h-0 overflow-y-auto px-6 pb-2">
					{error ? (
						<p role="alert" className="mb-4 text-sm text-destructive">
							{error.message}
						</p>
					) : null}
					<form
						id={id}
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							void form.handleSubmit();
						}}
					>
						{review ? (
							<DeliveryChangeReview rental={rental} body={review} />
						) : (
							<fieldset disabled={locked} className="min-w-0">
								<form.Field name="arrangement">
									{(field) => (
										<fieldset className="pb-5">
											<legend className="mb-3 text-sm font-semibold">
												Tipo de entrega
											</legend>
											<div className="grid gap-3 sm:grid-cols-2">
												{(
													[
														[
															"ROUTED",
															"De la sucursal",
															"Costo según dirección",
															Truck,
														],
														[
															"STAFF_ARRANGED",
															"Personalizada",
															"Coordinada por el equipo",
															Handshake,
														],
													] as const
												).map(([arrangement, label, description, Icon]) => (
													<label
														key={arrangement}
														className="flex cursor-pointer items-center gap-3 rounded-xl border p-4 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
													>
														<Icon
															className="size-6 shrink-0"
															aria-hidden="true"
														/>
														<span className="min-w-0 flex-1">
															<span className="block text-sm font-semibold">
																{label}
															</span>
															<span className="block text-xs text-muted-foreground">
																{description}
															</span>
														</span>
														<input
															type="radio"
															className="size-4 shrink-0 accent-primary"
															name={`${id}-arrangement`}
															checked={field.state.value === arrangement}
															onChange={() => {
																if (arrangement === field.state.value) return;
																form.reset(
																	deliveryDefaults(rental, arrangement),
																	{ keepDefaultValues: true },
																);
																setError(null);
															}}
														/>
													</label>
												))}
											</div>
										</fieldset>
									)}
								</form.Field>
								{transition ? (
									<p className="mb-4 text-xs text-muted-foreground">
										Configurá la nueva entrega. El acuerdo, los minutos y las
										excepciones anteriores no se trasladan.
									</p>
								) : null}
								<DeliverySection
									key={`${values.arrangement}-address`}
									title="Dirección de entrega"
									inputId={`${id}-address`}
									icon={<MapPin />}
									summary={proposedAddress || "Ingresá una dirección"}
									initialOpen={transition}
								>
									<form.Field name="address">
										{(field) => (
											<Field data-invalid={!field.state.meta.isValid}>
												{staff ? (
													<Input
														id={`${id}-address`}
														value={field.state.value}
														onBlur={field.handleBlur}
														aria-invalid={!field.state.meta.isValid}
														onChange={(event) => {
															field.handleChange(event.target.value);
															form.setFieldValue("changeAddress", true);
														}}
													/>
												) : (
													<DeliveryAddressAutocomplete
														id={`${id}-address`}
														name={field.name}
														value={field.state.value}
														isInvalid={!field.state.meta.isValid}
														onBlur={field.handleBlur}
														onChange={(address) => {
															field.handleChange(address);
															form.setFieldValue("changeAddress", true);
															form.setFieldValue("locationId", "");
														}}
														onSelect={(suggestion) => {
															field.handleChange(suggestion.formattedAddress);
															form.setFieldValue("changeAddress", true);
															form.setFieldValue(
																"locationId",
																suggestion.locationId,
															);
														}}
													/>
												)}
												<FieldError errors={field.state.meta.errors} />
												<p className="text-xs text-muted-foreground">
													{staff
														? "Ingresá la dirección o referencia coordinada con el equipo."
														: "Seleccioná una sugerencia. La ubicación y la ruta se validan al guardar."}
												</p>
											</Field>
										)}
									</form.Field>
									{!transition && values.changeAddress ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => {
												form.setFieldValue("changeAddress", false);
												form.setFieldValue(
													"address",
													rental.fulfillment.deliveryDetails?.address ?? "",
												);
												form.setFieldValue("locationId", "");
											}}
										>
											Restablecer dirección actual
										</Button>
									) : null}
								</DeliverySection>
								<DeliverySection
									key={`${values.arrangement}-pricing`}
									title="Entrega y retiro"
									icon={<Coins />}
									summary={priceSummary}
									description={priceDetail}
									initialOpen={transition}
									onEdit={() => {
										if (!transition && values.pricing !== "SET") {
											form.setFieldValue(
												"amount",
												delivery.effectiveDeliveryCharge,
											);
										}
									}}
								>
									<div className="grid gap-3 sm:grid-cols-[1fr_1.5fr]">
										<form.Field name="amount">
											{(field) => (
												<Field data-invalid={!field.state.meta.isValid}>
													<FieldLabel htmlFor={`${id}-amount`}>
														Importe ({delivery.currency})
													</FieldLabel>
													<Input
														id={`${id}-amount`}
														inputMode="decimal"
														value={field.state.value}
														onBlur={field.handleBlur}
														aria-invalid={!field.state.meta.isValid}
														onChange={(event) => {
															field.handleChange(event.target.value);
															form.setFieldValue("pricing", "SET");
														}}
													/>
													<FieldError errors={field.state.meta.errors} />
												</Field>
											)}
										</form.Field>
										<form.Field name="reason">
											{(field) => (
												<Field>
													<FieldLabel htmlFor={`${id}-reason`}>
														Motivo (opcional)
													</FieldLabel>
													<Input
														id={`${id}-reason`}
														placeholder="Ej. ajuste por condiciones especiales"
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(event) => {
															field.handleChange(event.target.value);
															form.setFieldValue("pricing", "SET");
														}}
													/>
												</Field>
											)}
										</form.Field>
									</div>
									{!staff ? (
										<div className="space-y-1">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={
													!canRequestAutomaticDeliveryPrice(values, rental)
												}
												onClick={() => form.setFieldValue("pricing", "CLEAR")}
											>
												Usar precio automático
											</Button>
											<p className="text-xs text-muted-foreground">
												{canRequestAutomaticDeliveryPrice(values, rental)
													? values.pricing === "CLEAR"
														? "Precio automático seleccionado. Se validará al guardar."
														: "Se validará al guardar; el importe puede cambiar."
													: "Requiere cambiar la dirección o los minutos para obtener un nuevo cálculo."}
											</p>
										</div>
									) : null}
								</DeliverySection>
								<DeliverySection
									key={`${values.arrangement}-minutes`}
									title="Tiempo reservado para transporte"
									inputId={`${id}-minutes`}
									icon={<Clock3 />}
									summary={minutesSummary}
									initialOpen={transition && staff}
								>
									<form.Field name="minutes">
										{(field) => (
											<Field data-invalid={!field.state.meta.isValid}>
												<div className="flex items-center gap-2">
													<Input
														className="w-28"
														id={`${id}-minutes`}
														type="number"
														min="0"
														step="1"
														inputMode="numeric"
														value={field.state.value}
														onBlur={field.handleBlur}
														aria-invalid={!field.state.meta.isValid}
														onChange={(event) => {
															field.handleChange(event.target.value);
															form.setFieldValue("changeMinutes", true);
														}}
													/>
													<span className="text-sm text-muted-foreground">
														min
													</span>
												</div>
												<FieldError errors={field.state.meta.errors} />
												<p className="text-xs text-muted-foreground">
													{staff
														? "Usá un número entero. Puede ser 0."
														: "Debe respetar la configuración de transporte de la sucursal."}{" "}
													Los cambios se validan contra las reservas de equipos
													al guardar.
												</p>
											</Field>
										)}
									</form.Field>
									{values.changeMinutes && !(transition && staff) ? (
										<Button
											type="button"
											variant="ghost"
											size="sm"
											onClick={() => {
												form.setFieldValue("changeMinutes", false);
												form.setFieldValue(
													"minutes",
													transition
														? ""
														: String(delivery.transportReservationMinutes),
												);
											}}
										>
											{transition
												? "Usar configuración de la sucursal"
												: "Restablecer minutos actuales"}
										</Button>
									) : null}
								</DeliverySection>
								{!staff ? (
									<details key={values.arrangement} className="py-4 text-sm">
										<summary className="cursor-pointer text-xs text-muted-foreground">
											Opciones avanzadas · Excepción a la política de entrega
											{values.authorizeException
												? " · Autorización pendiente"
												: ""}
										</summary>
										<div className="mt-4 space-y-3 rounded-lg border p-4">
											<p className="flex items-center gap-2 font-medium">
												<ShieldCheck className="size-4" aria-hidden="true" />
												Excepción a la política de entrega
											</p>
											<p className="text-xs text-muted-foreground">
												Autorizá solo si necesitás exceptuar una restricción de
												entrega. No omite la validación de ubicación, ruta ni
												disponibilidad de equipos. Las restricciones se evalúan
												al guardar.
											</p>
											{delivery.arrangement === "ROUTED" &&
											delivery.policyException ? (
												<div className="space-y-1 text-xs text-muted-foreground">
													<p>
														Excepción actual (no se traslada a condiciones
														nuevas):
													</p>
													{delivery.policyException.overriddenRestrictions.map(
														(restriction) => (
															<p key={restriction}>
																{deliveryRestrictionLabels[restriction]}
															</p>
														),
													)}
													{delivery.policyException.reason ? (
														<p className="whitespace-pre-wrap break-words">
															Motivo: {delivery.policyException.reason}
														</p>
													) : null}
												</div>
											) : null}
											<form.Field name="authorizeException">
												{(field) => (
													<label
														htmlFor={`${id}-exception-authorize`}
														className="flex items-start gap-2"
													>
														<Checkbox
															id={`${id}-exception-authorize`}
															aria-label="Autorizar excepción para estas condiciones"
															checked={field.state.value}
															onCheckedChange={(checked) =>
																field.handleChange(checked === true)
															}
														/>
														Autorizar excepción para estas condiciones
													</label>
												)}
											</form.Field>
											{values.authorizeException ? (
												<form.Field name="exceptionReason">
													{(field) => (
														<Field>
															<FieldLabel htmlFor={`${id}-exception-reason`}>
																Motivo (opcional)
															</FieldLabel>
															<Input
																id={`${id}-exception-reason`}
																value={field.state.value}
																onBlur={field.handleBlur}
																onChange={(event) =>
																	field.handleChange(event.target.value)
																}
															/>
														</Field>
													)}
												</form.Field>
											) : null}
										</div>
									</details>
								) : null}
							</fieldset>
						)}
					</form>
				</div>
				<DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
					<Button
						type="button"
						variant="outline"
						disabled={pending}
						onClick={review ? () => setReview(null) : onClose}
					>
						{review ? "Volver a editar" : "Cancelar"}
					</Button>
					<Button type="submit" form={id} disabled={locked || !changed}>
						{pending
							? "Guardando..."
							: review
								? "Guardar cambios"
								: "Revisar cambios"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function DeliverySection({
	title,
	inputId,
	icon,
	summary,
	description,
	initialOpen = false,
	onEdit,
	children,
}: {
	title: string;
	inputId?: string;
	icon: ReactNode;
	summary: ReactNode;
	description?: string;
	initialOpen?: boolean;
	onEdit?: () => void;
	children: ReactNode;
}) {
	const [open, setOpen] = useState(initialOpen);
	const id = useId();
	return (
		<section className="border-t py-5">
			<div className="flex items-start gap-3">
				<span
					className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600 [&_svg]:size-5"
					aria-hidden="true"
				>
					{icon}
				</span>
				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-semibold">
						{inputId ? <label htmlFor={inputId}>{title}</label> : title}
					</h3>
					{!open ? (
						<>
							<p className="mt-1 break-words text-base font-medium">
								{summary}
							</p>
							{description ? (
								<p className="mt-0.5 text-xs text-muted-foreground">
									{description}
								</p>
							) : null}
						</>
					) : null}
					<div id={id} hidden={!open} className="mt-2 space-y-3">
						{children}
					</div>
				</div>
				<Button
					type="button"
					variant="ghost"
					size="sm"
					className="shrink-0"
					aria-label={`${open ? "Aceptar" : "Cambiar"}: ${title}`}
					aria-expanded={open}
					aria-controls={id}
					onClick={() => {
						if (!open) onEdit?.();
						setOpen(!open);
					}}
				>
					{open ? <Check className="size-4" /> : <Pencil className="size-4" />}
					<span className="hidden sm:inline">
						{open ? "Aceptar" : "Cambiar"}
					</span>
				</Button>
			</div>
		</section>
	);
}

function DeliveryChangeReview({
	rental,
	body,
}: {
	rental: DeliveryRental;
	body: ChangeConfirmedRentalDeliveryBodyDto;
}) {
	const current = rental.acceptedDelivery;
	if (!current) return null;
	const decisions = body.deliveryDecisions;
	const agreement = decisions?.pricingAgreement;
	const arrangement = body.destination?.arrangement ?? current.arrangement;
	const transition = arrangement !== current.arrangement;
	const nextMinutes = decisions?.transportReservationMinutes;
	const reevaluated =
		arrangement === "ROUTED" &&
		Boolean(
			body.destination ||
				nextMinutes !== undefined ||
				decisions?.policyException,
		);
	const arrangementLabel = (value: typeof arrangement) =>
		value === "ROUTED" ? "De la sucursal" : "Personalizada";
	return (
		<div className="space-y-4 pb-4 text-sm">
			<dl className="space-y-4 rounded-lg border bg-neutral-50 p-4">
				<div>
					<dt className="font-medium">
						Tipo de entrega · {transition ? "Cambia" : "Se conserva"}
					</dt>
					<dd>
						{transition ? `${arrangementLabel(current.arrangement)} → ` : ""}
						{arrangementLabel(arrangement)}
					</dd>
				</div>
				<div>
					<dt className="font-medium">
						Dirección · {body.destination ? "Cambia" : "Se conserva"}
					</dt>
					<dd className="break-words">
						{rental.fulfillment.deliveryDetails?.formattedAddress ??
							rental.fulfillment.deliveryDetails?.address}
						{body.destination ? ` → ${body.destination.address}` : ""}
					</dd>
				</div>
				<div>
					<dt className="font-medium">
						Precio ·{" "}
						{agreement?.type === "SET" || agreement?.type === "CLEAR"
							? "Cambia"
							: current.staffAgreement
								? "Se conserva el acuerdo"
								: reevaluated
									? "Se recalcula"
									: "Se conserva"}
					</dt>
					<dd>
						{agreement?.type === "SET"
							? `${formatMoney(current.effectiveDeliveryCharge, current.currency)} → ${formatMoney(agreement.amount, current.currency)}`
							: agreement?.type === "CLEAR"
								? "Se solicita precio automático. El importe se determinará al guardar."
								: current.staffAgreement
									? `${formatMoney(current.staffAgreement.amount, current.currency)} (acuerdo actual)`
									: reevaluated
										? "Precio automático por calcular al guardar."
										: formatMoney(
												current.effectiveDeliveryCharge,
												current.currency,
											)}
					</dd>
					{agreement?.type === "SET" && agreement.reason ? (
						<dd className="whitespace-pre-wrap break-words">
							Motivo: {agreement.reason}
						</dd>
					) : null}
				</div>
				<div>
					<dt className="font-medium">
						Tiempo reservado para transporte ·{" "}
						{nextMinutes !== undefined || transition ? "Cambia" : "Se conserva"}
					</dt>
					<dd>
						{nextMinutes !== undefined
							? `${current.transportReservationMinutes} → ${nextMinutes} minutos`
							: transition
								? "Se usará la configuración actual de la sucursal, no los minutos anteriores."
								: `${current.transportReservationMinutes} minutos, sujetos a validación si cambian las condiciones.`}
					</dd>
				</div>
				{decisions?.policyException ? (
					<div>
						<dt className="font-medium">Excepción solicitada</dt>
						<dd>
							Se autoriza para las nuevas condiciones.
							{decisions.policyException.reason
								? ` Motivo: ${decisions.policyException.reason}`
								: ""}
						</dd>
					</div>
				) : null}
			</dl>
		</div>
	);
}
