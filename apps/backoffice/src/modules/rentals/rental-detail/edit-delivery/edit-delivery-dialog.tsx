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
import { Textarea } from "@repo/ui/components/textarea";
import { useStore } from "@tanstack/react-form";
import { useQueryClient } from "@tanstack/react-query";
import { useId, useState } from "react";
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

	const pricingOptions = [
		...(!transition
			? [
					{
						value: "KEEP",
						label: delivery.staffAgreement
							? "Conservar acuerdo actual"
							: "Mantener precio automático",
						disabled: false,
					},
				]
			: []),
		{
			value: "SET",
			label: transition
				? "Establecer nuevo importe acordado"
				: "Editar importe acordado",
			disabled: false,
		},
		...(!staff && (transition || delivery.staffAgreement)
			? [
					{
						value: "CLEAR",
						label: "Usar precio automático (quitar acuerdo)",
						disabled: !canRequestAutomaticDeliveryPrice(values, rental),
					},
				]
			: []),
	];

	return (
		<Dialog
			open
			onOpenChange={(open) => {
				if (!open && !pending) onClose();
			}}
			disablePointerDismissal={pending}
		>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl"
				showCloseButton={!pending}
			>
				<DialogHeader>
					<DialogTitle>
						{review
							? "Revisar cambios de entrega"
							: "Editar condiciones de entrega"}
					</DialogTitle>
					<DialogDescription>
						Modificá la entrega sin cambiar el período ni los precios de los
						productos. El precio de entrega y retiro puede afectar el total del
						alquiler.
					</DialogDescription>
				</DialogHeader>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error.message}
					</p>
				) : null}
				<form
					id={id}
					className="space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					{review ? (
						<DeliveryChangeReview rental={rental} body={review} />
					) : (
						<fieldset disabled={locked} className="min-w-0 space-y-5">
							<form.Field name="arrangement">
								{(field) => (
									<fieldset className="space-y-2">
										<legend className="mb-2 text-sm font-medium">
											Modalidad de entrega
										</legend>
										{(
											[
												["ROUTED", "Envío automático"],
												["STAFF_ARRANGED", "Coordinado por el equipo"],
											] as const
										).map(([arrangement, label]) => (
											<label
												key={arrangement}
												className="flex items-center gap-2 text-sm"
											>
												<input
													type="radio"
													name={`${id}-arrangement`}
													checked={field.state.value === arrangement}
													onChange={() => {
														form.reset(deliveryDefaults(rental, arrangement));
														setError(null);
													}}
												/>
												{label}
											</label>
										))}
									</fieldset>
								)}
							</form.Field>
							<p className="text-sm text-muted-foreground">
								{transition
									? "Estás cambiando la modalidad. Se requieren nuevos datos; no se trasladan el acuerdo ni los minutos anteriores."
									: "Estás editando la modalidad actual. Los datos que no cambies se conservan."}
							</p>
							<section className="space-y-3">
								<p className="break-words text-sm">
									<span className="font-medium">Destino actual: </span>
									{rental.fulfillment.deliveryDetails?.formattedAddress ??
										rental.fulfillment.deliveryDetails?.address}
								</p>
								{!transition ? (
									<form.Field name="changeAddress">
										{(field) => (
											<label
												htmlFor={`${id}-change-address`}
												className="flex items-center gap-2 text-sm"
											>
												<Checkbox
													id={`${id}-change-address`}
													checked={field.state.value}
													onCheckedChange={(checked) => {
														field.handleChange(checked === true);
														form.setFieldValue("locationId", "");
														form.setFieldValue(
															"address",
															rental.fulfillment.deliveryDetails?.address ?? "",
														);
													}}
												/>
												Cambiar dirección
											</label>
										)}
									</form.Field>
								) : null}
								{transition || values.changeAddress ? (
									<form.Field name="address">
										{(field) => (
											<Field data-invalid={!field.state.meta.isValid}>
												<FieldLabel htmlFor={`${id}-address`}>
													{staff
														? "Dirección de entrega"
														: "Buscar dirección de entrega"}
												</FieldLabel>
												{staff ? (
													<Textarea
														id={`${id}-address`}
														value={field.state.value}
														onBlur={field.handleBlur}
														aria-invalid={!field.state.meta.isValid}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
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
															form.setFieldValue("locationId", "");
														}}
														onSelect={(suggestion) => {
															field.handleChange(suggestion.formattedAddress);
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
														? "Escribí el destino libremente. No se requiere geolocalización."
														: "Seleccioná una sugerencia. La ubicación y la ruta se validan al guardar."}
												</p>
											</Field>
										)}
									</form.Field>
								) : null}
							</section>
							<section className="space-y-3">
								<p className="text-sm">
									<span className="font-medium">
										Precio actual de entrega y retiro:{" "}
									</span>
									{formatMoney(
										delivery.effectiveDeliveryCharge,
										delivery.currency,
									)}
									{delivery.staffAgreement
										? " · Importe acordado"
										: " · Precio calculado"}
								</p>
								<form.Field name="pricing">
									{(field) => (
										<Field data-invalid={!field.state.meta.isValid}>
											<fieldset
												className="space-y-2"
												aria-invalid={!field.state.meta.isValid}
											>
												<legend className="mb-2 text-sm font-medium">
													Precio a aplicar
												</legend>
												{pricingOptions.map((option) => (
													<label
														key={option.value}
														className="flex items-center gap-2 text-sm"
													>
														<input
															type="radio"
															name={`${id}-pricing`}
															checked={field.state.value === option.value}
															disabled={option.disabled}
															onBlur={field.handleBlur}
															onChange={() => field.handleChange(option.value)}
														/>
														{option.label}
													</label>
												))}
											</fieldset>
											<FieldError errors={field.state.meta.errors} />
										</Field>
									)}
								</form.Field>
								{pricingOptions.some(
									(option) => option.value === "CLEAR" && option.disabled,
								) ? (
									<p className="text-xs text-muted-foreground">
										No hay un precio automático guardado para quitar el acuerdo.
										Podés conservar o editar el importe acordado.
									</p>
								) : null}
								{staff && transition ? (
									<p className="text-xs text-muted-foreground">
										El nuevo importe acordado y los minutos de transporte son
										obligatorios. Ambos pueden ser cero.
									</p>
								) : null}
								{values.pricing === "SET" ? (
									<>
										<form.Field name="amount">
											{(field) => (
												<Field data-invalid={!field.state.meta.isValid}>
													<FieldLabel htmlFor={`${id}-amount`}>
														Importe acordado ({delivery.currency})
													</FieldLabel>
													<Input
														id={`${id}-amount`}
														inputMode="decimal"
														value={field.state.value}
														onBlur={field.handleBlur}
														aria-invalid={!field.state.meta.isValid}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
													/>
													<FieldError errors={field.state.meta.errors} />
												</Field>
											)}
										</form.Field>
										<form.Field name="reason">
											{(field) => (
												<Field>
													<FieldLabel htmlFor={`${id}-reason`}>
														Motivo del acuerdo (opcional)
													</FieldLabel>
													<Textarea
														id={`${id}-reason`}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={(event) =>
															field.handleChange(event.target.value)
														}
													/>
												</Field>
											)}
										</form.Field>
									</>
								) : delivery.staffAgreement &&
									!transition &&
									values.pricing === "KEEP" &&
									delivery.staffAgreement.reason ? (
									<p className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
										Motivo actual: {delivery.staffAgreement.reason}
									</p>
								) : null}
							</section>
							<section className="space-y-3">
								<p className="text-sm">
									<span className="font-medium">
										Reserva actual para transporte:{" "}
									</span>
									{delivery.transportReservationMinutes} min
								</p>
								{!(transition && staff) ? (
									<form.Field name="changeMinutes">
										{(field) => (
											<label
												htmlFor={`${id}-change-minutes`}
												className="flex items-center gap-2 text-sm"
											>
												<Checkbox
													id={`${id}-change-minutes`}
													checked={field.state.value}
													onCheckedChange={(checked) =>
														field.handleChange(checked === true)
													}
												/>
												{transition
													? "Indicar minutos de transporte"
													: "Cambiar minutos de transporte"}
											</label>
										)}
									</form.Field>
								) : null}
								{values.changeMinutes || (transition && staff) ? (
									<form.Field name="minutes">
										{(field) => (
											<Field data-invalid={!field.state.meta.isValid}>
												<FieldLabel htmlFor={`${id}-minutes`}>
													Minutos de reserva para transporte
												</FieldLabel>
												<Input
													id={`${id}-minutes`}
													inputMode="numeric"
													value={field.state.value}
													onBlur={field.handleBlur}
													aria-invalid={!field.state.meta.isValid}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
												/>
												<FieldError errors={field.state.meta.errors} />
												<p className="text-xs text-muted-foreground">
													Cero es válido. Cambiar los minutos puede afectar las
													reservas de equipos; los conflictos pueden impedir
													guardar.
												</p>
											</Field>
										)}
									</form.Field>
								) : null}
								{!staff ? (
									<p className="text-xs text-muted-foreground">
										Los minutos deben coincidir con la configuración de
										transporte de la sucursal cuando exista.{" "}
										{transition
											? "Sin un valor explícito se usará la configuración actual; si no existe, deberás indicar los minutos."
											: "Si cambió la configuración, puede ser necesario actualizar los minutos incluso al cambiar solo el destino."}
									</p>
								) : null}
							</section>
							{!staff ? (
								<details className="rounded-md border p-3 text-sm">
									<summary className="cursor-pointer font-medium">
										Excepción a las políticas de entrega
									</summary>
									<div className="mt-3 space-y-3">
										{delivery.arrangement === "ROUTED" &&
										delivery.policyException ? (
											<div className="space-y-1 text-xs text-muted-foreground">
												<p className="font-medium">
													Excepción aceptada actualmente
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
										<p className="text-xs text-muted-foreground">
											Solo autorizá una excepción si corresponde a estas
											condiciones. No evita la validación de ubicación, ruta ni
											reservas. Una excepción anterior no se traslada a
											condiciones nuevas.
										</p>
										<form.Field name="authorizeException">
											{(field) => (
												<label
													htmlFor={`${id}-authorize-exception`}
													className="flex items-start gap-2"
												>
													<Checkbox
														id={`${id}-authorize-exception`}
														checked={field.state.value}
														onCheckedChange={(checked) =>
															field.handleChange(checked === true)
														}
													/>
													Autorizar una excepción para estas condiciones
												</label>
											)}
										</form.Field>
										{values.authorizeException ? (
											<form.Field name="exceptionReason">
												{(field) => (
													<Field>
														<FieldLabel htmlFor={`${id}-exception`}>
															Motivo de la excepción (opcional)
														</FieldLabel>
														<Textarea
															id={`${id}-exception`}
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
				<DialogFooter>
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
	const newPricing = agreement?.type === "SET" || agreement?.type === "CLEAR";
	const nextMinutes = decisions?.transportReservationMinutes;
	return (
		<div className="space-y-4 text-sm">
			<dl className="space-y-3 rounded-lg border bg-neutral-50 p-4">
				<div>
					<dt className="font-medium">
						Modalidad {transition ? "· Cambia" : "· Se conserva"}
					</dt>
					<dd>
						{transition
							? `${current.arrangement === "ROUTED" ? "Envío automático" : "Coordinado por el equipo"} → `
							: ""}
						{arrangement === "ROUTED"
							? "Envío automático"
							: "Coordinado por el equipo"}
					</dd>
				</div>
				<div>
					<dt className="font-medium">
						Dirección {body.destination ? "· Cambia" : "· Se conserva"}
					</dt>
					<dd className="break-words">
						{body.destination ? (
							<>
								{rental.fulfillment.deliveryDetails?.formattedAddress ??
									rental.fulfillment.deliveryDetails?.address}{" "}
								→ {body.destination.address}
							</>
						) : (
							(rental.fulfillment.deliveryDetails?.formattedAddress ??
							rental.fulfillment.deliveryDetails?.address)
						)}
					</dd>
				</div>
				<div>
					<dt className="font-medium">
						Precio{" "}
						{newPricing
							? "· Cambia"
							: current.staffAgreement
								? "· Se conserva el acuerdo"
								: "· Automático"}
					</dt>
					<dd>
						{agreement?.type === "SET"
							? `${formatMoney(current.effectiveDeliveryCharge, current.currency)} → ${formatMoney(agreement.amount, current.currency)} (nuevo acuerdo)`
							: agreement?.type === "CLEAR"
								? "Se quita el acuerdo anterior y se solicita un nuevo precio automático."
								: current.staffAgreement
									? `${formatMoney(current.staffAgreement.amount, current.currency)} (acuerdo actual)`
									: "Precio automático: se evaluará si cambian las condiciones."}
					</dd>
					{agreement?.type === "SET" && agreement.reason ? (
						<dd className="whitespace-pre-wrap break-words">
							Motivo: {agreement.reason}
						</dd>
					) : null}
				</div>
				<div>
					<dt className="font-medium">Reserva para transporte</dt>
					<dd>
						{nextMinutes !== undefined
							? `${current.transportReservationMinutes} → ${nextMinutes} min`
							: transition
								? "Se usará la configuración actual de la sucursal, no los minutos anteriores."
								: `Se conservan ${current.transportReservationMinutes} min, sujetos a validación si cambian las condiciones.`}
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
			<p className="text-muted-foreground">
				Se conservan el período, los productos y sus precios aceptados. El total
				del alquiler puede cambiar por el nuevo precio de entrega y retiro y la
				firma del contrato puede requerir renovación.
			</p>
			<p className="text-muted-foreground">
				{arrangement === "ROUTED"
					? "Estos cambios aún no están guardados. La ubicación, la ruta y las reservas se validarán cuando corresponda; no se garantiza disponibilidad hasta que se acepte la operación."
					: "Estos cambios aún no están guardados. Las reservas de equipos se validarán si cambian los minutos; no se garantiza disponibilidad hasta que se acepte la operación."}
			</p>
		</div>
	);
}
