import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import {
	type EditAssetFormValues,
	editAssetFormSchema,
} from "./edit-asset.schema";

interface EditAssetFormProps {
	formId: string;
	defaultValues: EditAssetFormValues;
	isPending: boolean;
	onSubmit: (values: EditAssetFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function EditAssetForm({
	formId,
	defaultValues,
	isPending,
	onSubmit,
	onCancel,
}: EditAssetFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: editAssetFormSchema,
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
				className="space-y-8"
			>
				<FieldGroup className="grid gap-5">
					<form.Field name="serialNumber">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Número de serie{" "}
										<span className="text-muted-foreground text-xs">
											(opcional)
										</span>
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={isInvalid}
										placeholder="Ej. SN-123456"
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="notes">
						{(field) => (
							<Field>
								<FieldLabel htmlFor={field.name}>
									Notas{" "}
									<span className="text-muted-foreground text-xs">
										(opcional)
									</span>
								</FieldLabel>
								<Textarea
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									placeholder="Notas internas sobre esta unidad física."
									className="min-h-20"
								/>
							</Field>
						)}
					</form.Field>
				</FieldGroup>
			</form>

			<div className="flex justify-end gap-3 border-t pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isSubmitting,
						state.isDirty,
					]}
				>
					{([canSubmit, isSubmitting, isDirty]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || !isDirty || isSubmitting || isPending}
						>
							{isSubmitting || isPending ? "Guardando..." : "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
