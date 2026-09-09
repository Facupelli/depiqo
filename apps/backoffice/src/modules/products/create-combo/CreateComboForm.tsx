import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
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

import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import { useAppForm } from "@/shared/contexts/form.context";
import { ComboRequirementEditor } from "../combo-form/combo-requirement-editor";
import type { CreateComboSubmissionError } from "./create-combo.errors";
import {
	type CreateComboFormValues,
	createComboFormDefaultValues,
	createComboFormSchema,
} from "./create-combo.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface CreateComboFormProps {
	formId: string;
	defaultValues?: CreateComboFormValues;
	categories: SelectOption[];
	branches: SelectOption[];
	isPending: boolean;
	submitError?: CreateComboSubmissionError | null;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreateComboFormValues) => Promise<void> | void;
	onCancel: () => void;
}

const NO_CATEGORY_VALUE = "sin-categoria";
export function CreateComboForm({
	formId,
	defaultValues = createComboFormDefaultValues(),
	categories,
	branches,
	isPending,
	submitError,
	submitLabel = "Crear combo",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateComboFormProps) {
	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: createComboFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});
	const categoryItems = [
		{ value: NO_CATEGORY_VALUE, label: "Sin categoría" },
		...categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];

	return (
		<>
			<form
				id={formId}
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-12"
			>
				<section className="space-y-5">
					<div>
						<h2 className="font-semibold text-lg">Información del combo</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							Configura cómo se presentará en el catálogo.
						</p>
					</div>
					<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
						<FieldGroup className="grid gap-5">
							<form.Field name="name">
								{(field) => {
									const invalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={invalid}
												placeholder="Ej. Combo de producción audiovisual"
											/>
											{invalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="categoryId">
								{(field) => {
									const invalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={field.name}>Categoría</FieldLabel>
											<Select
												name={field.name}
												items={categoryItems}
												value={field.state.value || NO_CATEGORY_VALUE}
												onValueChange={(value) =>
													field.handleChange(
														value === NO_CATEGORY_VALUE || value == null
															? ""
															: value,
													)
												}
											>
												<SelectTrigger id={field.name} aria-invalid={invalid}>
													<SelectValue placeholder="Selecciona una categoría" />
												</SelectTrigger>
												<SelectContent>
													{categoryItems.map((item) => (
														<SelectItem key={item.value} value={item.value}>
															{item.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{invalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="description">
								{(field) => {
									const invalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={field.name}>
												Descripción{" "}
												<span className="text-muted-foreground text-xs">
													(opcional)
												</span>
											</FieldLabel>
											<Textarea
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={invalid}
												placeholder="Qué incluye este combo y para qué tipo de alquiler sirve."
												className="min-h-20 bg-white"
											/>
											{invalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						</FieldGroup>
						<form.Field name="imageUrl">
							{(field) => {
								const invalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={invalid} className="self-start">
										<div>
											<FieldLabel>Imagen</FieldLabel>
											<p className="mt-1 text-muted-foreground text-sm">
												Usa una imagen que represente el combo completo.
											</p>
										</div>
										<CatalogImageUploader
											currentPath={field.state.value}
											onUploadComplete={(path) => field.handleChange(path)}
										/>
										{invalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						</form.Field>
					</div>
				</section>

				<ComboRequirementEditor
					form={form}
					fields={{ requirements: "requirements" }}
				/>

				<section className="border-t pt-8">
					<form.Field name="branchIds" mode="array">
						{(field) => {
							const invalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<FieldSet data-invalid={invalid}>
									<FieldLegend
										variant="label"
										className="mb-0 font-semibold text-lg"
									>
										Disponible en
									</FieldLegend>
									<p className="text-muted-foreground text-sm">
										Selecciona las sucursales donde se ofrecerá este combo.
									</p>
									<FieldGroup
										data-slot="checkbox-group"
										className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
									>
										{branches.map((branch) => {
											const checkboxId = `${formId}-branch-${branch.id}`;
											const checked = field.state.value.includes(branch.id);
											return (
												<Field
													key={branch.id}
													orientation="horizontal"
													data-invalid={invalid}
													className="rounded-lg border p-3 text-sm"
												>
													<Checkbox
														id={checkboxId}
														name={field.name}
														checked={checked}
														aria-invalid={invalid}
														onCheckedChange={(nextChecked) => {
															if (nextChecked && !checked) {
																field.pushValue(branch.id);
															}
															if (!nextChecked) {
																const index = field.state.value.indexOf(
																	branch.id,
																);
																if (index >= 0) field.removeValue(index);
															}
														}}
													/>
													<FieldLabel
														htmlFor={checkboxId}
														className="font-normal"
													>
														{branch.name}
													</FieldLabel>
												</Field>
											);
										})}
									</FieldGroup>
									{invalid && <FieldError errors={field.state.meta.errors} />}
								</FieldSet>
							);
						}}
					</form.Field>
				</section>
			</form>

			<div className="sticky bottom-0 mt-10 flex flex-wrap justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
				{submitError && (
					<p className="mr-auto self-center text-destructive text-sm">
						{submitError.message}
					</p>
				)}
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
							disabled={!canSubmit || !isDirty || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
