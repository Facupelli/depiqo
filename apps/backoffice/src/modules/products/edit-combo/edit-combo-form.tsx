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
import { Skeleton } from "@repo/ui/components/skeleton";
import { Textarea } from "@repo/ui/components/textarea";
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import { useAppForm } from "@/shared/contexts/form.context";
import { ComboRequirementEditor } from "../combo-form/combo-requirement-editor";
import type { EditComboSubmissionError } from "./edit-combo.errors";
import {
	type EditComboFormValues,
	editComboFormSchema,
} from "./edit-combo.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface EditComboFormProps {
	formId: string;
	defaultValues: EditComboFormValues;
	categories: SelectOption[];
	isCategoriesLoading?: boolean;
	isPending: boolean;
	submitError?: EditComboSubmissionError | null;
	onSubmit: (values: EditComboFormValues) => Promise<void>;
	onCancel: () => void;
}

const NO_CATEGORY_VALUE = "sin-categoria";

export function EditComboForm({
	formId,
	defaultValues,
	categories,
	isCategoriesLoading = false,
	isPending,
	submitError,
	onSubmit,
	onCancel,
}: EditComboFormProps) {
	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: editComboFormSchema },
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
				className="space-y-8 lg:space-y-12"
			>
				<section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8">
					<FieldGroup className="grid gap-5">
						<form.Field name="name">
							{(field) => {
								const invalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={invalid}>
										<FieldLabel htmlFor={field.name}>
											Nombre del combo
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={invalid}
										/>
										{invalid && <FieldError errors={field.state.meta.errors} />}
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
										{isCategoriesLoading ? (
											<Skeleton className="h-9 w-full" />
										) : (
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
										)}
										{invalid && <FieldError errors={field.state.meta.errors} />}
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
											Descripción breve
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
											placeholder="Información corta para identificar el producto."
											className="min-h-16 bg-white"
										/>
										{invalid && <FieldError errors={field.state.meta.errors} />}
									</Field>
								);
							}}
						</form.Field>
					</FieldGroup>

					<form.Field name="imageUrl">
						{(field) => (
							<Field className="self-start">
								<div>
									<FieldLabel>Imagen del combo</FieldLabel>
									<p className="mt-1 text-muted-foreground text-sm">
										La imagen ayuda a reconocer el combo rápidamente en el
										catálogo.
									</p>
								</div>
								<CatalogImageUploader
									inputId={field.name}
									inputName={field.name}
									currentPath={field.state.value}
									onUploadComplete={(path) => field.handleChange(path)}
								/>
							</Field>
						)}
					</form.Field>
				</section>

				<ComboRequirementEditor
					form={form}
					fields={{ requirements: "requirements" }}
				/>
			</form>

			<div className="sticky bottom-0 mt-8 flex flex-wrap justify-end gap-4 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80 lg:mt-10">
				{submitError && (
					<p
						className="mr-auto self-center text-destructive text-sm"
						role="alert"
					>
						{submitError.message}
					</p>
				)}
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
							disabled={!canSubmit || !isDirty || isPending}
						>
							{isSubmitting || isPending ? "Guardando..." : "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
