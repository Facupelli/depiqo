import type { InvoiceDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useForm, useStore } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import {
	createInvoiceFormDefaults,
	hasInvoiceRegistrationChanges,
	invoiceFormSchema,
	invoiceToFormValues,
	toCorrectInvoiceRegistrationBody,
	toRegisterExternalInvoiceBody,
} from "./invoice-form.schema";
import { type InvoicingUiError, toInvoicingUiError } from "./invoicing.errors";
import {
	useCorrectInvoiceRegistration,
	useRegisterExternalInvoice,
} from "./invoicing.mutations";

type InvoiceFormDialogProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
} & (
	| {
			mode: "register";
			rentalId: string;
			acceptedCustomerTotal: string | null;
			currency: string | null;
			registrationEligible: boolean;
			onRentalContextStale: () => Promise<void>;
	  }
	| {
			mode: "correct";
			// The snapshot captured when the user starts editing, not live query data.
			invoice: InvoiceDto;
			blockedMessage: string | null;
	  }
);

const invoiceFields = [
	{
		name: "reference",
		label: "Referencia de la factura",
		input: { type: "text", maxLength: 255, autoComplete: "off" },
	},
	{
		name: "issuedOn",
		label: "Fecha de emisión",
		input: { type: "date" },
	},
	{
		name: "amount",
		label: "Importe",
		input: { inputMode: "decimal", maxLength: 64, placeholder: "0,00" },
	},
	{
		name: "externalUrl",
		label: "Enlace externo (opcional)",
		input: { type: "url", maxLength: 2048, placeholder: "https://..." },
	},
	{
		name: "sourceSystem",
		label: "Sistema de origen (opcional)",
		input: { type: "text", maxLength: 100 },
	},
] as const;

export function InvoiceFormDialog(props: InvoiceFormDialogProps) {
	if (!props.open) return null;

	const id = props.mode === "register" ? props.rentalId : props.invoice.id;
	return <OpenInvoiceFormDialog key={`${props.mode}:${id}`} {...props} />;
}

function OpenInvoiceFormDialog(props: InvoiceFormDialogProps) {
	const { onOpenChange } = props;
	const formId = useId();
	const timezone = useTenantTimezone();
	const registerInvoice = useRegisterExternalInvoice();
	const correctInvoice = useCorrectInvoiceRegistration();
	const currency =
		props.mode === "register" ? props.currency : props.invoice.currency;
	const [defaultValues] = useState(() =>
		props.mode === "register"
			? createInvoiceFormDefaults(
					props.acceptedCustomerTotal,
					formatTimestampInTimezone(new Date(), timezone, "YYYY-MM-DD"),
				)
			: invoiceToFormValues(props.invoice),
	);
	const [serverError, setServerError] = useState<InvoicingUiError | null>(null);
	const blockedMessage =
		props.mode === "correct"
			? props.blockedMessage
			: props.registrationEligible
				? null
				: "Este alquiler ya no admite nuevos registros de factura. Cerrá el diálogo y revisá su estado actual.";
	const submissionBlocked =
		blockedMessage !== null ||
		Boolean(
			serverError &&
				serverError.kind !== "validation" &&
				serverError.kind !== "unknown",
		);
	const isMutationPending =
		registerInvoice.isPending || correctInvoice.isPending;
	const form = useForm({
		defaultValues,
		validators: { onSubmit: invoiceFormSchema },
		onSubmit: async ({ value }) => {
			if (submissionBlocked || isMutationPending) return;
			setServerError(null);

			try {
				if (props.mode === "correct") {
					const body = toCorrectInvoiceRegistrationBody(props.invoice, value);
					if (!body) return;
					await correctInvoice.mutateAsync({
						rentalId: props.invoice.rentalId,
						invoiceId: props.invoice.id,
						body,
					});
					toast.success("Registro de factura corregido");
				} else {
					await registerInvoice.mutateAsync(
						toRegisterExternalInvoiceBody(props.rentalId, value),
					);
					toast.success("Factura registrada en Depiqo");
				}
				onOpenChange(false);
			} catch (error) {
				const uiError = toInvoicingUiError(
					error,
					props.mode === "correct"
						? "No pudimos guardar la corrección. Revisá tu conexión e intentá nuevamente."
						: "No pudimos registrar la factura. Revisá tu conexión e intentá nuevamente.",
				);
				setServerError(uiError);

				if (
					props.mode === "register" &&
					(uiError.kind === "rental-ineligible" ||
						uiError.kind === "rental-not-found")
				) {
					try {
						await props.onRentalContextStale();
					} catch {
						setServerError({
							...uiError,
							message: `${uiError.message} No pudimos actualizar el alquiler. Actualizá la página para revisar su estado.`,
						});
					}
				}
			}
		},
	});
	const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
	const isPending = isSubmitting || isMutationPending;

	function handleOpenChange(nextOpen: boolean) {
		if (!nextOpen && isPending) return;
		onOpenChange(nextOpen);
	}

	return (
		<Dialog
			open
			onOpenChange={handleOpenChange}
			disablePointerDismissal={isPending}
		>
			<DialogContent
				className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
				showCloseButton={!isPending}
			>
				<DialogHeader>
					<DialogTitle>
						{props.mode === "correct"
							? "Corregir registro de factura"
							: "Registrar factura"}
					</DialogTitle>
					<DialogDescription>
						{props.mode === "correct"
							? "Solo se corregirán los datos registrados en Depiqo. La factura del sistema externo no se modificará."
							: "Registrá una factura ya emitida en un sistema externo. Depiqo no genera ni cancela esa factura."}
					</DialogDescription>
				</DialogHeader>

				<form
					id={formId}
					noValidate
					className="min-w-0 space-y-5"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					{invoiceFields.map(({ name, label, input }) => (
						<form.Field key={name} name={name}>
							{(field) => {
								const invalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								const fieldId = `${formId}-${name}`;
								const hintId = `${fieldId}-hint`;

								return (
									<Field data-invalid={invalid} className="min-w-0 gap-2">
										<FieldLabel htmlFor={fieldId}>
											{label}
											{name === "amount" && currency ? ` (${currency})` : ""}
										</FieldLabel>
										<Input
											{...input}
											id={fieldId}
											name={name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => {
												if (!submissionBlocked) setServerError(null);
												field.handleChange(event.target.value);
											}}
											aria-invalid={invalid}
											aria-describedby={name === "amount" ? hintId : undefined}
											disabled={isPending}
										/>
										{name === "amount" ? (
											<FieldDescription id={hintId}>
												El importe es editable. Usá punto o coma decimal, sin
												separadores de miles. Hasta 4 decimales.
											</FieldDescription>
										) : null}
										{invalid ? (
											<FieldError errors={field.state.meta.errors} />
										) : null}
									</Field>
								);
							}}
						</form.Field>
					))}

					{serverError ? (
						<div
							className="space-y-2 rounded-md border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
							role="alert"
						>
							<p>{serverError.message}</p>
							{props.mode === "correct" && submissionBlocked ? (
								<p>
									Tus cambios siguen en pantalla. Cerrá el diálogo y revisá el
									registro actual antes de volver a editarlo.
								</p>
							) : null}
							{serverError.kind === "unauthorized" ? (
								<a
									href="/login"
									className="font-medium underline underline-offset-4"
								>
									Volver a iniciar sesión
								</a>
							) : null}
						</div>
					) : blockedMessage && !isPending ? (
						<p className="text-sm text-destructive" role="alert">
							{blockedMessage}
						</p>
					) : null}

					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							disabled={isPending}
							onClick={() => handleOpenChange(false)}
						>
							Cancelar
						</Button>
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.values] as const}
						>
							{([canSubmit, values]) => {
								const hasChanges =
									props.mode === "register" ||
									hasInvoiceRegistrationChanges(props.invoice, values);
								return (
									<Button
										type="submit"
										disabled={
											!canSubmit ||
											!hasChanges ||
											isPending ||
											submissionBlocked
										}
									>
										{isPending ? (
											<Loader2 className="size-4 animate-spin" />
										) : null}
										{props.mode === "correct"
											? isPending
												? "Guardando..."
												: "Guardar corrección"
											: isPending
												? "Registrando..."
												: "Registrar factura"}
									</Button>
								);
							}}
						</form.Subscribe>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
