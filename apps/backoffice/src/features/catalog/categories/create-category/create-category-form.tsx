import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useForm } from "@tanstack/react-form";
import { Loader2 } from "lucide-react";
import {
	type CreateCategoryFormValues,
	createCategoryFormDefaults,
	createCategoryFormSchema,
} from "./create-category-form.schema";

interface CreateCategoryFormProps {
	formId: string;
	defaultValues?: CreateCategoryFormValues;
	isPending: boolean;
	onSubmit: (values: CreateCategoryFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function CreateCategoryForm({
	formId,
	defaultValues = createCategoryFormDefaults,
	isPending,
	onSubmit,
	onCancel,
}: CreateCategoryFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createCategoryFormSchema,
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
				className="space-y-4"
			>
				<FieldGroup>
					<form.Field name="name">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={isInvalid}
										placeholder="Ej. Cámaras"
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="sortOrder">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Orden</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="number"
										step="1"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) =>
											field.handleChange(event.target.valueAsNumber || 0)
										}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>
			</form>

			<div className="flex justify-end gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
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
							{(isSubmitting || isPending) && (
								<Loader2 className="mr-2 size-4 animate-spin" />
							)}
							Crear
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
