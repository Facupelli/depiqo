import {
	type ChangeConfirmedRentalDeliveryAgreementBodyDto,
	DeliveryAgreementAmountSchema,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
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
import { z } from "zod";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { rentalKeys } from "@/modules/rentals/rental.queries";
import { useAppForm } from "@/shared/contexts/form.context";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import {
	decimalsEqual,
	parsePlainDecimal,
} from "@/shared/utils/decimal-string";
import { formatMoney } from "@/shared/utils/formatters";
import { contractKeys } from "../documents/signing/rental-contract-signing.queries";
import { useRentalDetailContext } from "../rental-detail.context";
import { toDeliveryAgreementError } from "./edit-delivery-agreement.errors";
import { useEditDeliveryAgreement } from "./edit-delivery-agreement.mutation";

const formSchema = z
	.object({
		mode: z.enum(["SET", "CLEAR"]),
		amount: z.string(),
		reason: z.string(),
	})
	.superRefine((value, context) => {
		if (
			value.mode === "SET" &&
			!DeliveryAgreementAmountSchema.safeParse(value.amount).success
		) {
			context.addIssue({
				code: "custom",
				path: ["amount"],
				message:
					"Ingresá un importe mayor o igual a cero con precisión de centavos.",
			});
		}
	});

function amountsEqual(left: string, right: string) {
	const a = parsePlainDecimal(left);
	const b = parsePlainDecimal(right);
	return a !== null && b !== null && decimalsEqual(a, b);
}

export function EditDeliveryAgreementDialog({
	open,
	onOpenChange,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	if (!open) return null;
	return <OpenDeliveryAgreementDialog onClose={() => onOpenChange(false)} />;
}

function OpenDeliveryAgreementDialog({ onClose }: { onClose: () => void }) {
	const { rental: currentRental } = useRentalDetailContext();
	// Keep the persisted values and concurrency token from this editing session.
	const [rental] = useState(() => currentRental);
	const delivery =
		rental.acceptedDelivery?.arrangement === "ROUTED"
			? rental.acceptedDelivery
			: null;
	const timezone = useTenantTimezone();
	const mutation = useEditDeliveryAgreement();
	const queryClient = useQueryClient();
	const [error, setError] = useState<ReturnType<
		typeof toDeliveryAgreementError
	> | null>(null);
	const formId = useId();
	const amountId = useId();
	const reasonId = useId();
	const modeName = useId();

	function isUnchanged(value: z.infer<typeof formSchema>) {
		if (value.mode === "CLEAR") return !delivery?.staffAgreement;
		return Boolean(
			delivery?.staffAgreement &&
				amountsEqual(value.amount, delivery.staffAgreement.amount) &&
				value.reason.trim() === (delivery.staffAgreement.reason?.trim() ?? ""),
		);
	}

	const form = useAppForm({
		defaultValues: {
			mode: delivery?.staffAgreement
				? ("SET" as const)
				: ("CLEAR" as "SET" | "CLEAR"),
			amount:
				delivery?.staffAgreement?.amount ??
				delivery?.effectiveDeliveryCharge ??
				"",
			reason: delivery?.staffAgreement?.reason ?? "",
		},
		validators: { onChange: formSchema, onSubmit: formSchema },
		onSubmit: async ({ value }) => {
			if (!delivery || mutation.isPending || error?.stale || isUnchanged(value))
				return;
			if (
				rental.status !== "CONFIRMED" ||
				rental.fulfillment.method !== "DELIVERY" ||
				Date.now() >= Date.parse(rental.period.end)
			)
				return;
			const parsed = formSchema.parse(value);
			if (parsed.mode === "CLEAR" && delivery.deliveryTotal === undefined)
				return;
			const agreement: ChangeConfirmedRentalDeliveryAgreementBodyDto["agreement"] =
				parsed.mode === "CLEAR"
					? { type: "CLEAR" }
					: {
							type: "SET",
							amount: parsed.amount.trim(),
							...(parsed.reason.trim() ? { reason: parsed.reason.trim() } : {}),
						};
			setError(null);
			try {
				await mutation.mutateAsync({
					rentalId: rental.id,
					expectedVersion: rental.version,
					agreement,
				});
				onClose();
				toast.success("Precio de entrega y retiro actualizado");
			} catch (cause) {
				const nextError = toDeliveryAgreementError(cause);
				setError(nextError);
				if (nextError.stale) {
					await Promise.all([
						queryClient.invalidateQueries({ queryKey: rentalKeys.all() }),
						queryClient.invalidateQueries({
							queryKey: contractKeys.rentalSigningSummary(rental.id),
						}),
					]);
				}
			}
		},
	});

	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
	if (!delivery) return null;
	const pending = mutation.isPending || isSubmitting;
	const locked = pending || Boolean(error?.stale);

	return (
		<Dialog
			open
			onOpenChange={(next) => {
				if (!next && !pending) onClose();
			}}
			disablePointerDismissal={pending}
		>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
				showCloseButton={!pending}
			>
				<DialogHeader>
					<DialogTitle>Editar precio de entrega y retiro</DialogTitle>
					<DialogDescription>
						Este cambio solo modifica el precio de entrega y retiro. No cambia
						las fechas, la dirección ni los equipos.
					</DialogDescription>
				</DialogHeader>
				<dl className="space-y-3 rounded-lg border bg-neutral-50 p-4 text-sm">
					<div className="flex justify-between gap-4">
						<dt>Precio calculado</dt>
						<dd className="text-right font-mono font-semibold">
							{delivery.deliveryTotal !== undefined
								? formatMoney(delivery.deliveryTotal, delivery.currency)
								: "Sin precio calculado"}
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt>Importe aplicado actualmente</dt>
						<dd className="text-right font-mono font-semibold">
							{formatMoney(delivery.effectiveDeliveryCharge, delivery.currency)}
						</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt>Total actual del alquiler</dt>
						<dd className="text-right font-mono font-semibold">
							{rental.acceptedCustomerTotal !== null
								? formatMoney(rental.acceptedCustomerTotal, delivery.currency)
								: "Sin total confirmado"}
						</dd>
					</div>
					{delivery.staffAgreement ? (
						<>
							{delivery.staffAgreement.reason ? (
								<div>
									<dt className="text-muted-foreground">
										Motivo del acuerdo actual
									</dt>
									<dd className="whitespace-pre-wrap break-words">
										{delivery.staffAgreement.reason}
									</dd>
								</div>
							) : null}
							<div>
								<dt className="text-muted-foreground">Fecha del acuerdo</dt>
								<dd>
									{formatTimestampInTimezone(
										delivery.staffAgreement.agreedAt,
										timezone,
										"DD/MM/YYYY HH:mm",
									)}
								</dd>
							</div>
						</>
					) : null}
				</dl>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error.message}
					</p>
				) : null}
				<form
					id={formId}
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						void form.handleSubmit();
					}}
				>
					<form.Field name="mode">
						{(field) => (
							<fieldset disabled={locked} className="space-y-2">
								<legend className="mb-2 text-sm font-medium">
									Precio a aplicar
								</legend>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="radio"
										name={modeName}
										checked={field.state.value === "SET"}
										onChange={() => field.handleChange("SET")}
									/>
									Importe acordado
								</label>
								<label className="flex items-center gap-2 text-sm">
									<input
										type="radio"
										name={modeName}
										checked={field.state.value === "CLEAR"}
										disabled={delivery.deliveryTotal === undefined}
										onChange={() => field.handleChange("CLEAR")}
									/>
									Usar precio calculado
								</label>
								{delivery.deliveryTotal === undefined ? (
									<p className="text-sm text-muted-foreground">
										No se puede quitar el acuerdo porque no hay un precio
										calculado guardado. Podés actualizar el importe o el motivo.
									</p>
								) : null}
							</fieldset>
						)}
					</form.Field>
					<form.Subscribe selector={(state) => state.values.mode}>
						{(mode) =>
							mode === "SET" ? (
								<>
									<form.Field name="amount">
										{(field) => (
											<Field data-invalid={!field.state.meta.isValid}>
												<FieldLabel htmlFor={amountId}>
													Importe acordado
												</FieldLabel>
												<Input
													id={amountId}
													inputMode="decimal"
													value={field.state.value}
													disabled={locked}
													aria-invalid={!field.state.meta.isValid}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
												/>
												{!field.state.meta.isValid ? (
													<FieldError>
														Ingresá un importe mayor o igual a cero con
														precisión de centavos.
													</FieldError>
												) : null}
											</Field>
										)}
									</form.Field>
									<form.Field name="reason">
										{(field) => (
											<Field>
												<FieldLabel htmlFor={reasonId}>
													Motivo (opcional)
												</FieldLabel>
												<Textarea
													id={reasonId}
													value={field.state.value}
													disabled={locked}
													onBlur={field.handleBlur}
													onChange={(event) =>
														field.handleChange(event.target.value)
													}
												/>
											</Field>
										)}
									</form.Field>
								</>
							) : null
						}
					</form.Subscribe>
					<form.Subscribe selector={(state) => state.values}>
						{(values) => {
							const nextAmount =
								values.mode === "CLEAR"
									? delivery.deliveryTotal
									: values.amount;
							return nextAmount !== undefined &&
								formSchema.safeParse(values).success &&
								!amountsEqual(nextAmount, delivery.effectiveDeliveryCharge) ? (
								<p className="text-sm text-muted-foreground">
									Al cambiar el importe aplicado, la firma del contrato
									existente puede requerir renovación.
								</p>
							) : null;
						}}
					</form.Subscribe>
				</form>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						disabled={pending}
						onClick={onClose}
					>
						Cancelar
					</Button>
					<form.Subscribe
						selector={(state) => ({
							canSubmit: state.canSubmit,
							submitting: state.isSubmitting,
							values: state.values,
						})}
					>
						{({ canSubmit, submitting, values }) => (
							<Button
								type="submit"
								form={formId}
								disabled={
									locked || submitting || !canSubmit || isUnchanged(values)
								}
							>
								{pending || submitting ? "Guardando..." : "Guardar"}
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
