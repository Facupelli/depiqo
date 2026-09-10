import {
	Field,
	FieldDescription,
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
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import { withForm } from "@/shared/contexts/form.context";
import type { CreateEquipmentSubmissionError } from "./create-equipment.errors";
import { createEquipmentFormDefaultValues } from "./create-equipment.schema";
import { WizardStepHeading } from "./wizard-step-heading";

const noCategoryValue = "no-category";

interface CategoryItem {
	value: string;
	label: string;
}

export const EquipmentStep = withForm({
	defaultValues: createEquipmentFormDefaultValues(),
	props: {
		categoryItems: [] as CategoryItem[],
		submitError: null as CreateEquipmentSubmissionError | null,
		onClearSubmitError: () => {},
	},
	render: function Render({
		form,
		categoryItems,
		submitError,
		onClearSubmitError,
	}) {
		return (
			<section className="space-y-6">
				<WizardStepHeading
					title="Equipo"
					description="Define la información principal del equipo."
				/>
				<div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
					<FieldGroup className="grid gap-5">
						<form.Field name="equipment.name">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								const serverError =
									submitError?.kind === "field" ? submitError.message : null;
								return (
									<Field data-invalid={isInvalid || !!serverError}>
										<FieldLabel htmlFor={field.name}>Nombre</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) => {
												if (serverError) onClearSubmitError();
												field.handleChange(event.target.value);
											}}
											aria-invalid={isInvalid || !!serverError}
											placeholder="Ej. Cámara Sony FX3"
										/>
										{isInvalid ? (
											<FieldError errors={field.state.meta.errors} />
										) : serverError ? (
											<p className="text-destructive text-sm">{serverError}</p>
										) : null}
									</Field>
								);
							}}
						</form.Field>
						<form.Field name="equipment.categoryId">
							{(field) => (
								<Field>
									<FieldLabel htmlFor={field.name}>
										Categoría{" "}
										<span className="text-muted-foreground text-xs">
											(opcional)
										</span>
									</FieldLabel>
									<Select
										items={[
											{ value: noCategoryValue, label: "Sin categoría" },
											...categoryItems,
										]}
										value={field.state.value || noCategoryValue}
										onValueChange={(value) =>
											field.handleChange(
												value === noCategoryValue || value == null ? "" : value,
											)
										}
									>
										<SelectTrigger
											id={field.name}
											name={field.name}
											aria-invalid={false}
										>
											<SelectValue placeholder="Sin categoría" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value={noCategoryValue}>
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
						<form.Field name="equipment.description">
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
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={false}
										placeholder="Información corta para identificar el equipo."
										className="min-h-24"
									/>
								</Field>
							)}
						</form.Field>
					</FieldGroup>
					<form.Field name="equipment.imageUrl">
						{(field) => (
							<Field className="self-start">
								<FieldLabel>Imagen</FieldLabel>
								<FieldDescription>
									La imagen ayuda a reconocer el equipo rápidamente.
								</FieldDescription>
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
		);
	},
});
