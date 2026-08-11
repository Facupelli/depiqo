import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { useForm } from "@tanstack/react-form";
import { useId } from "react";
import {
	createPublicSigningFormDefaults,
	type PublicSigningFormValues,
	publicSigningFormSchema,
} from "./public-signing-form.schema";
import { SignaturePadField } from "./signature-pad-field";

type PublicSigningFormProps = {
	acceptanceText: string;
	submitError: string | null;
	isPending: boolean;
	onSubmit: (values: PublicSigningFormValues) => Promise<void>;
};

export function PublicSigningForm({
	acceptanceText,
	submitError,
	isPending,
	onSubmit,
}: PublicSigningFormProps) {
	const acceptedId = useId();
	const form = useForm({
		defaultValues: createPublicSigningFormDefaults(),
		validators: { onSubmit: publicSigningFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-6"
			noValidate
		>
			<form.Field name="signatureImageDataUrl">
				{(field) => {
					const isInvalid =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<Field data-invalid={isInvalid}>
							<SignaturePadField
								value={field.state.value}
								disabled={isPending}
								isInvalid={isInvalid}
								onChange={field.handleChange}
							/>
							{isInvalid ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</Field>
					);
				}}
			</form.Field>

			<form.Field name="accepted">
				{(field) => {
					const isInvalid =
						field.state.meta.isTouched && !field.state.meta.isValid;
					return (
						<Field data-invalid={isInvalid}>
							<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-700">
								{acceptanceText}
							</div>
							<div className="mt-3 flex items-start gap-3">
								<Checkbox
									id={acceptedId}
									checked={field.state.value}
									onCheckedChange={(checked) =>
										field.handleChange(checked === true)
									}
									disabled={isPending}
								/>
								<FieldLabel
									htmlFor={acceptedId}
									className="text-sm leading-5 text-neutral-800"
								>
									Confirmo expresamente mi aceptación del texto anterior.
								</FieldLabel>
							</div>
							{isInvalid ? (
								<FieldError errors={field.state.meta.errors} />
							) : null}
						</Field>
					);
				}}
			</form.Field>

			{submitError ? <FieldError>{submitError}</FieldError> : null}

			<form.Subscribe
				selector={(state) => [state.canSubmit, state.isSubmitting]}
			>
				{([canSubmit, isSubmitting]) => (
					<Button
						type="submit"
						disabled={!canSubmit || isSubmitting || isPending}
						className="h-12 w-full"
					>
						{isSubmitting || isPending
							? "Registrando firma..."
							: "Firmar y completar"}
					</Button>
				)}
			</form.Subscribe>
		</form>
	);
}
