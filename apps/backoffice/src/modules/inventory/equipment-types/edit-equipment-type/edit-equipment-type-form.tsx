import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import {
	type EditEquipmentTypeFormValues,
	editEquipmentTypeFormSchema,
} from "./edit-equipment-type.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface SelectItemOption {
	value: string;
	label: string;
}

const NO_CATEGORY_VALUE = "no-category";

interface EditEquipmentTypeFormProps {
	formId: string;
	defaultValues: EditEquipmentTypeFormValues;
	categories: SelectOption[];
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: EditEquipmentTypeFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function EditEquipmentTypeForm({
	formId,
	defaultValues,
	categories,
	isPending,
	submitLabel = "Guardar cambios",
	pendingLabel = "Guardando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: EditEquipmentTypeFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: editEquipmentTypeFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const categoryItems: SelectItemOption[] = categories.map((category) => ({
		value: category.id,
		label: category.name,
	}));

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
					<form.Field name="categoryId">
						{(field) => (
							<Field>
								<FieldLabel>
									Categoría{" "}
									<span className="text-muted-foreground text-xs">
										(opcional)
									</span>
								</FieldLabel>
								<Select
									items={categoryItems}
									value={field.state.value || NO_CATEGORY_VALUE}
									onValueChange={(value) =>
										field.handleChange(
											value === NO_CATEGORY_VALUE || value == null ? "" : value,
										)
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="Sin categoría" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value={NO_CATEGORY_VALUE}>
											Sin categoría
										</SelectItem>
										{categoryItems.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>
						)}
					</form.Field>

					<form.Field name="name">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Nombre del equipo
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={isInvalid}
										placeholder="Ej. Cámara Sony FX3"
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="description">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Descripción breve{" "}
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
										aria-invalid={isInvalid}
										placeholder="Información corta para identificar el tipo de equipo."
										className="min-h-20"
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="imageUrl">
						{(field) => (
							<Field className="self-start">
								<div>
									<FieldLabel>Imagen del equipo</FieldLabel>
									<p className="mt-1 text-muted-foreground text-sm">
										La imagen ayuda a reconocer el equipo rápidamente.
									</p>
								</div>
								<CatalogImageUploader
									currentPath={field.state.value}
									onUploadComplete={(path) => field.handleChange(path)}
								/>
							</Field>
						)}
					</form.Field>
				</FieldGroup>
			</form>

			<div className="flex justify-end gap-3 border-t pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					{cancelLabel}
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
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
