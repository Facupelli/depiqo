import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldDescription,
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
import {
	type CreateIndividualRentalFormValues,
	createIndividualRentalFormSchema,
} from "./create-individual-rental.schema";

interface Option {
	id: string;
	name: string;
}

interface CreateIndividualRentalFormProps {
	defaultValues: CreateIndividualRentalFormValues;
	categories: Option[];
	branches: Option[];
	isPending: boolean;
	submitError: string | null;
	onSubmit: (values: CreateIndividualRentalFormValues) => Promise<void>;
	onCancel: () => void;
}

const formId = "create-individual-rental";
const noCategoryValue = "no-category";

export function CreateIndividualRentalForm({
	defaultValues,
	categories,
	branches,
	isPending,
	submitError,
	onSubmit,
	onCancel,
}: CreateIndividualRentalFormProps) {
	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: createIndividualRentalFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
	});
	const categoryItems = [
		{ value: noCategoryValue, label: "Sin categoría" },
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
				className="space-y-10"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				<section className="space-y-5">
					<div>
						<h2 className="font-semibold text-lg">Presentación del alquiler</h2>
						<p className="mt-1 text-muted-foreground text-sm">
							Estos datos comienzan con la información del equipo, pero podés
							editarlos sin modificarlo.
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
											/>
											{invalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
							<form.Field name="categoryId">
								{(field) => (
									<Field>
										<FieldLabel htmlFor={field.name}>Categoría</FieldLabel>
										<Select
											name={field.name}
											items={categoryItems}
											value={field.state.value || noCategoryValue}
											onValueChange={(value) =>
												field.handleChange(
													value === noCategoryValue || value == null
														? ""
														: value,
												)
											}
										>
											<SelectTrigger id={field.name}>
												<SelectValue placeholder="Sin categoría" />
											</SelectTrigger>
											<SelectContent>
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
							<form.Field name="description">
								{(field) => (
									<Field>
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
											className="min-h-24"
										/>
									</Field>
								)}
							</form.Field>
						</FieldGroup>
						<form.Field name="imageUrl">
							{(field) => (
								<Field className="self-start">
									<FieldLabel htmlFor={field.name}>Imagen</FieldLabel>
									<CatalogImageUploader
										inputId={field.name}
										inputName={field.name}
										currentPath={field.state.value}
										onUploadComplete={field.handleChange}
									/>
								</Field>
							)}
						</form.Field>
					</div>
				</section>

				<section className="border-t pt-8">
					<form.Field name="branchIds" mode="array">
						{(field) => {
							const invalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<FieldSet data-invalid={invalid}>
									<FieldLegend
										variant="label"
										className="font-semibold text-lg"
									>
										Disponible en
									</FieldLegend>
									<FieldDescription>
										Selecciona al menos una sucursal comercial.
									</FieldDescription>
									<FieldGroup className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{branches.map((branch) => {
											const checkboxId = `${formId}-branch-${branch.id}`;
											const selectedIndex = field.state.value.indexOf(
												branch.id,
											);
											return (
												<Field
													key={branch.id}
													orientation="horizontal"
													className="rounded-lg border p-3"
												>
													<Checkbox
														id={checkboxId}
														name={field.name}
														checked={selectedIndex !== -1}
														aria-invalid={invalid}
														onCheckedChange={(checked) => {
															if (checked && selectedIndex === -1)
																field.pushValue(branch.id);
															if (!checked && selectedIndex !== -1)
																field.removeValue(selectedIndex);
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
				{submitError ? (
					<p
						role="alert"
						className="mr-auto self-center text-destructive text-sm"
					>
						{submitError}
					</p>
				) : null}
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || isPending}
						>
							{isSubmitting || isPending
								? "Creando..."
								: "Crear alquiler individual"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
