import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	createRentalSigningInvitationFormDefaults,
	type RentalSigningInvitationFormValues,
	rentalSigningInvitationFormSchema,
} from "../rental-signing-invitation.schema";

interface RentalSigningInvitationFormProps {
	defaultValues?: RentalSigningInvitationFormValues;
	isPending: boolean;
	isResend?: boolean;
	onSubmit: (values: RentalSigningInvitationFormValues) => Promise<void>;
	onCancel: () => void;
}

export function RentalSigningInvitationForm({
	defaultValues,
	isPending,
	isResend = false,
	onSubmit,
	onCancel,
}: RentalSigningInvitationFormProps) {
	const formId = useId();
	const form = useForm({
		defaultValues:
			defaultValues ?? createRentalSigningInvitationFormDefaults(null),
		validators: {
			onSubmit: rentalSigningInvitationFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	return (
		<>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				<FieldGroup>
					<form.Field name="recipientEmail">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Email del firmante
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="email"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										placeholder="cliente@ejemplo.com"
										aria-invalid={isInvalid}
										disabled={isPending}
									/>
									{isInvalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>
			</form>

			<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || isSubmitting || isPending}
						>
							{isSubmitting || isPending
								? isResend
									? "Reenviando invitación..."
									: "Enviando invitación..."
								: isResend
									? "Reenviar invitación"
									: "Enviar invitación"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
