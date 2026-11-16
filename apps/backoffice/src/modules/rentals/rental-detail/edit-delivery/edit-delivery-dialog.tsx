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
						"Ya pasó la hora de inicio del alquiler. No se pueden cambiar las condiciones de entrega.",
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
		!staff && (transition || values.changeAddress || values.authorizeException);
	const preservedAgreement =
		!transition && values.pricing === "KEEP" ? delivery.staffAgreement : null;
	const calculatedReference =
		!transition && !staff && delivery.arrangement === "ROUTED"
			? delivery.deliveryTotal
			: undefined;
	const priceSummary =
		values.pricing === "SET"
			? values.amount && /^\d+(\.\d{1,2})?$/.test(values.amount.trim())
				? formatMoney(values.amount, delivery.currency)
				: "Ingresá un importe"
			: automaticReevaluation && !preservedAgreement
				? "Precio por calcular al guardar"
				: values.pricing === "CLEAR" && calculatedReference !== undefined
					? formatMoney(calculatedReference, delivery.currency)
					: transition
						? staff
							? "Ingresá un importe"
							: "Precio por calcular al guardar"
						: formatMoney(delivery.effectiveDeliveryCharge, delivery.currency);
	const priceDetail =
		values.pricing === "SET"
			? "Importe propuesto"
			: preservedAgreement
				? "Importe definido"
				: staff
					? "Definí un nuevo importe"
					: "Precio calculado";
	const minutesSummary =
		staff && values.changeMinutes
			? values.minutes.trim()
				? `${values.minutes} minutos`
				: "Ingresá el tiempo en minutos"
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
												Condiciones de envío
											</legend>
											<div className="grid gap-3 sm:grid-cols-2">
												{(
													[
														[
															"ROUTED",
															"Según configuración",
															"Dirección y condiciones de la sucursal",
															Truck,
														],
														[
															"STAFF_ARRANGED",
															"A medida",
															"Destino, importe y tiempo definidos por vos",
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
										Definí las condiciones del nuevo envío. Revisá el destino,
										el importe y el tiempo para transporte.
									</p>
								) : null}
								<DeliverySection
									key={`${values.arrangement}-address`}
									title={staff ? "Destino de entrega" : "Dirección de entrega"}
									inputId={`${id}-address`}
									icon={<MapPin />}
									summary={
										proposedAddress ||
										(staff ? "Ingresá un destino" : "Ingresá una dirección")
									}
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
														? "Ingresá la dirección o una referencia para la entrega."
														: "Seleccioná una dirección de la lista. Validaremos la ubicación y la ruta al guardar."}
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
											{staff
												? "Restablecer destino actual"
												: "Restablecer dirección actual"}
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
												Usar precio calculado
											</Button>
											<p className="text-xs text-muted-foreground">
												{canRequestAutomaticDeliveryPrice(values, rental)
													? automaticReevaluation
														? values.pricing === "CLEAR"
															? "El precio se calculará al guardar y puede cambiar."
															: "Si usás el precio calculado, se calculará al guardar y puede cambiar."
														: values.pricing === "CLEAR"
															? "Se aplicará el precio calculado actual."
															: "Podés usar el precio calculado actual."
													: "No hay un precio calculado disponible. Revisá las condiciones de envío."}
											</p>
										</div>
									) : null}
								</DeliverySection>
								<DeliverySection
									key={`${values.arrangement}-minutes`}
									title="Tiempo para transporte"
									inputId={staff ? `${id}-minutes` : undefined}
									icon={<Clock3 />}
									summary={minutesSummary}
									description={
										staff
											? undefined
											: transition
												? "Se determinará al guardar según la configuración de la sucursal."
												: "Tiempo aceptado según la configuración de la sucursal. No se puede modificar manualmente."
									}
									initialOpen={transition && staff}
									editable={staff}
								>
									{staff ? (
										<>
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
															Los equipos quedan reservados este tiempo antes y
															después del alquiler. Ingresá minutos enteros;
															puede ser 0. Verificaremos la disponibilidad al
															guardar.
														</p>
													</Field>
												)}
											</form.Field>
											{values.changeMinutes && !transition ? (
												<Button
													type="button"
													variant="ghost"
													size="sm"
													onClick={() => {
														form.setFieldValue("changeMinutes", false);
														form.setFieldValue(
															"minutes",
															String(delivery.transportReservationMinutes),
														);
													}}
												>
													Restablecer tiempo actual
												</Button>
											) : null}
										</>
									) : null}
								</DeliverySection>
								{!staff ? (
									<details key={values.arrangement} className="py-4 text-sm">
										<summary className="cursor-pointer text-xs text-muted-foreground">
											Opciones avanzadas · Excepción a las condiciones de envío
											{values.authorizeException ? " · Por aplicar" : ""}
										</summary>
										<div className="mt-4 space-y-3 rounded-lg border p-4">
											<p className="flex items-center gap-2 font-medium">
												<ShieldCheck className="size-4" aria-hidden="true" />
												Excepción a las condiciones de envío
											</p>
											<p className="text-xs text-muted-foreground">
												Autorizá una excepción solo para las restricciones de
												envío. La dirección, la ruta y la disponibilidad de
												equipos deben ser válidas. Evaluaremos las restricciones
												al guardar.
											</p>
											{delivery.arrangement === "ROUTED" &&
											delivery.policyException ? (
												<div className="space-y-1 text-xs text-muted-foreground">
													<p>
														Excepción actual. Si cambian las condiciones de
														envío, revisá la autorización.
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
															aria-label="Autorizar una excepción para estas condiciones de envío"
															checked={field.state.value}
															onCheckedChange={(checked) =>
																field.handleChange(checked === true)
															}
														/>
														Autorizar una excepción para estas condiciones de
														envío
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
	editable = true,
	onEdit,
	children,
}: {
	title: string;
	inputId?: string;
	icon: ReactNode;
	summary: ReactNode;
	description?: string;
	initialOpen?: boolean;
	editable?: boolean;
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
				{editable ? (
					<Button
						type="button"
						variant="ghost"
						size="sm"
						className="shrink-0"
						aria-label={`${open ? "Listo" : "Cambiar"}: ${title}`}
						aria-expanded={open}
						aria-controls={id}
						onClick={() => {
							if (!open) onEdit?.();
							setOpen(!open);
						}}
					>
						{open ? (
							<Check className="size-4" />
						) : (
							<Pencil className="size-4" />
						)}
						<span className="hidden sm:inline">
							{open ? "Listo" : "Cambiar"}
						</span>
					</Button>
				) : null}
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
	const preservedAgreement =
		!transition && agreement?.type !== "SET" && agreement?.type !== "CLEAR"
			? current.staffAgreement
			: null;
	const calculatedReference =
		!transition && arrangement === "ROUTED" && current.arrangement === "ROUTED"
			? current.deliveryTotal
			: undefined;
	const nextMinutes = decisions?.transportReservationMinutes;
	const reevaluated =
		arrangement === "ROUTED" &&
		Boolean(
			body.destination ||
				nextMinutes !== undefined ||
				decisions?.policyException,
		);
	const arrangementLabel = (value: typeof arrangement) =>
		value === "ROUTED" ? "Según configuración" : "A medida";
	return (
		<div className="space-y-4 pb-4 text-sm">
			<dl className="space-y-4 rounded-lg border bg-neutral-50 p-4">
				<div>
					<dt className="font-medium">
						Condiciones de envío · {transition ? "Cambian" : "Se conservan"}
					</dt>
					<dd>
						{transition ? `${arrangementLabel(current.arrangement)} → ` : ""}
						{arrangementLabel(arrangement)}
					</dd>
				</div>
				<div>
					<dt className="font-medium">
						{arrangement === "STAFF_ARRANGED" ? "Destino" : "Dirección"} ·{" "}
						{body.destination ? "Cambia" : "Se conserva"}
					</dt>
					<dd className="break-words">
						{rental.fulfillment.deliveryDetails?.formattedAddress ??
							rental.fulfillment.deliveryDetails?.address}
						{body.destination ? ` → ${body.destination.address}` : ""}
					</dd>
				</div>
				<div>
					<dt className="font-medium">
						Entrega y retiro ·{" "}
						{agreement?.type === "SET"
							? "Importe propuesto"
							: transition || agreement?.type === "CLEAR"
								? "Cambia"
								: preservedAgreement
									? "Se conserva el importe definido"
									: reevaluated
										? "Se recalcula"
										: "Se conserva"}
					</dt>
					<dd>
						{agreement?.type === "SET"
							? `${formatMoney(current.effectiveDeliveryCharge, current.currency)} → ${formatMoney(agreement.amount, current.currency)}`
							: agreement?.type === "CLEAR"
								? reevaluated
									? "Precio por calcular al guardar"
									: calculatedReference !== undefined
										? `Se aplicará el precio calculado actual: ${formatMoney(calculatedReference, current.currency)}.`
										: "No hay un precio calculado disponible."
								: preservedAgreement
									? `${formatMoney(preservedAgreement.amount, current.currency)} (importe actual)`
									: reevaluated
										? "Precio por calcular al guardar"
										: transition
											? "Definí un nuevo importe."
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
						Tiempo para transporte ·{" "}
						{nextMinutes !== undefined || transition ? "Cambia" : "Se conserva"}
					</dt>
					<dd>
						{nextMinutes !== undefined
							? `${current.transportReservationMinutes} → ${nextMinutes} minutos`
							: transition
								? "Se usará el tiempo configurado en la sucursal."
								: `${current.transportReservationMinutes} minutos. Verificaremos la disponibilidad al guardar.`}
					</dd>
				</div>
				{decisions?.policyException ? (
					<div>
						<dt className="font-medium">Excepción por aplicar</dt>
						<dd>
							Autorizás una excepción para las nuevas condiciones de envío.
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
