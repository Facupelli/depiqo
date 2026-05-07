import { TrackingMode } from "@repo/types";
import { useForm, useStore } from "@tanstack/react-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CatalogImageUploader } from "@/features/catalog/components/catalog-image-uploader";
import { formatTrackingType } from "@/features/catalog/product-types/components/products-columns";
import {
	type ProductTypeFormValues,
	productTypeFormSchema,
} from "@/features/catalog/product-types/schemas/product-type-form.schema";

interface CategoryOption {
	id: string;
	name: string;
}

interface BillingUnitOption {
	id: string;
	label: string;
}

interface ProductTypeFormProps {
	defaultValues: ProductTypeFormValues;
	categories: CategoryOption[];
	billingUnits: BillingUnitOption[];
	copy?: Partial<ProductTypeFormCopy>;
	onSubmit: (payload: {
		values: ProductTypeFormValues;
		dirtyValues: Partial<ProductTypeFormValues>;
	}) => Promise<void> | void;
	onCancel: () => void;
	isPending: boolean;
	submitLabel: string;
	pendingLabel: string;
	cancelLabel: string;
	formId: string;
}

interface ProductTypeFormCopy {
	nameLabel: string;
	imageLabel: string;
	newArrivalsDescription: string;
}

const defaultCopy: ProductTypeFormCopy = {
	nameLabel: "Nombre del producto",
	imageLabel: "Imagen del producto",
	newArrivalsDescription:
		"Excluye este producto de la seccion de nuevos ingresos en la tienda.",
};

export function ProductTypeForm({
	defaultValues,
	categories,
	billingUnits,
	copy,
	onSubmit,
	onCancel,
	isPending,
	submitLabel,
	pendingLabel,
	cancelLabel,
	formId,
}: ProductTypeFormProps) {
	const formCopy = { ...defaultCopy, ...copy };
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: productTypeFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				values: value,
				dirtyValues: getDirtyValues(value, defaultValues),
			});
		},
	});

	const values = useStore(form.store, (state) => state.values);
	const hasChanges = !areEqual(values, defaultValues);

	return (
		<>
			<form
				id={formId}
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-8"
			>
				<FieldGroup>
					<form.Field name="categoryId">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Categoria</FieldLabel>
									<Select
										value={field.state.value || "sin-categoria"}
										onValueChange={(value) => {
											const nextValue =
												value === null || value === "sin-categoria"
													? ""
													: value;
											field.handleChange(nextValue);
										}}
										items={categories.map((category) => ({
											value: category.id,
											label: category.name,
										}))}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecciona una categoria" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="sin-categoria">
												Sin categoria
											</SelectItem>
											{categories.map((category) => (
												<SelectItem key={category.id} value={category.id}>
													{category.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="billingUnitId">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Unidad de cobro</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											value && field.handleChange(value)
										}
										items={billingUnits.map((unit) => ({
											value: unit.id,
											label: unit.label,
										}))}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecciona una unidad" />
										</SelectTrigger>
										<SelectContent>
											{billingUnits.map((unit) => (
												<SelectItem key={unit.id} value={unit.id}>
													{unit.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="name">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>{formCopy.nameLabel}</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="imageUrl">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field>
									<FieldLabel>{formCopy.imageLabel}</FieldLabel>
									<CatalogImageUploader
										currentPath={field.state.value}
										onUploadComplete={(path) => field.handleChange(path)}
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
										Descripcion{" "}
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
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="trackingMode">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Modo de seguimiento
									</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(value as TrackingMode)
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Selecciona un modo" />
										</SelectTrigger>
										<SelectContent>
											{Object.values(TrackingMode).map((mode) => (
												<SelectItem key={mode} value={mode}>
													{formatTrackingType(mode)}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="excludeFromNewArrivals">
						{(field) => (
							<div className="grid grid-cols-[1fr_auto] items-start gap-8 rounded-xl border border-border bg-card px-5 py-4">
								<div>
									<p className="text-sm font-semibold text-foreground">
										Ocultar de nuevos ingresos
									</p>
									<p className="mt-0.5 text-xs text-muted-foreground">
										{formCopy.newArrivalsDescription}
									</p>
								</div>
								<div className="pt-1">
									<Switch
										checked={field.state.value}
										onCheckedChange={field.handleChange}
										aria-label="Ocultar de nuevos ingresos"
									/>
								</div>
							</div>
						)}
					</form.Field>

					<div className="space-y-2">
						<FieldLabel>Atributos</FieldLabel>
						<form.Field name="attributes" mode="array">
							{(field) => (
								<div className="space-y-2">
									{field.state.value.map((attribute, index) => (
										<div
											key={`${attribute.key}-${attribute.value}-${index}`}
											className="flex items-start gap-2"
										>
											<form.Field name={`attributes[${index}].key`}>
												{(subField) => (
													<Field className="flex-1">
														<Input
															placeholder="Clave"
															value={subField.state.value}
															onBlur={subField.handleBlur}
															onChange={(e) =>
																subField.handleChange(e.target.value)
															}
														/>
														{subField.state.meta.isTouched &&
															!subField.state.meta.isValid && (
																<FieldError
																	errors={subField.state.meta.errors}
																/>
															)}
													</Field>
												)}
											</form.Field>
											<form.Field name={`attributes[${index}].value`}>
												{(subField) => (
													<Field className="flex-1">
														<Input
															placeholder="Valor"
															value={subField.state.value}
															onBlur={subField.handleBlur}
															onChange={(e) =>
																subField.handleChange(e.target.value)
															}
														/>
														{subField.state.meta.isTouched &&
															!subField.state.meta.isValid && (
																<FieldError
																	errors={subField.state.meta.errors}
																/>
															)}
													</Field>
												)}
											</form.Field>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												onClick={() => field.removeValue(index)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>
										</div>
									))}
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => field.pushValue({ key: "", value: "" })}
									>
										<Plus className="mr-2 h-4 w-4" />
										Agregar atributo
									</Button>
								</div>
							)}
						</form.Field>
					</div>

					<div className="space-y-2">
						<FieldLabel>Elementos incluidos</FieldLabel>
						<form.Field name="includedItems" mode="array">
							{(field) => (
								<div className="space-y-4">
									{field.state.value.map((item, index) => (
										<div
											key={`${item.name}-${item.quantity}-${item.notes}-${index}`}
											className="relative space-y-4 rounded-md border p-4"
										>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute top-2 right-2"
												onClick={() => field.removeValue(index)}
											>
												<Trash2 className="h-4 w-4" />
											</Button>

											<form.Field name={`includedItems[${index}].name`}>
												{(subField) => {
													const isInvalid =
														subField.state.meta.isTouched &&
														!subField.state.meta.isValid;

													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel>Nombre</FieldLabel>
															<Input
																type="text"
																value={subField.state.value}
																onBlur={subField.handleBlur}
																onChange={(e) =>
																	subField.handleChange(e.target.value)
																}
																aria-invalid={isInvalid}
															/>
															{isInvalid && (
																<FieldError
																	errors={subField.state.meta.errors}
																/>
															)}
														</Field>
													);
												}}
											</form.Field>

											<form.Field name={`includedItems[${index}].quantity`}>
												{(subField) => {
													const isInvalid =
														subField.state.meta.isTouched &&
														!subField.state.meta.isValid;

													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel>Cantidad</FieldLabel>
															<Input
																type="number"
																min={1}
																value={subField.state.value}
																onBlur={subField.handleBlur}
																onChange={(e) =>
																	subField.handleChange(Number(e.target.value))
																}
																aria-invalid={isInvalid}
															/>
															{isInvalid && (
																<FieldError
																	errors={subField.state.meta.errors}
																/>
															)}
														</Field>
													);
												}}
											</form.Field>

											<form.Field name={`includedItems[${index}].notes`}>
												{(subField) => {
													const isInvalid =
														subField.state.meta.isTouched &&
														!subField.state.meta.isValid;

													return (
														<Field data-invalid={isInvalid}>
															<FieldLabel>
																Notas{" "}
																<span className="text-muted-foreground text-xs">
																	(opcional)
																</span>
															</FieldLabel>
															<Input
																type="text"
																value={subField.state.value}
																onBlur={subField.handleBlur}
																onChange={(e) =>
																	subField.handleChange(e.target.value)
																}
																aria-invalid={isInvalid}
															/>
															{isInvalid && (
																<FieldError
																	errors={subField.state.meta.errors}
																/>
															)}
														</Field>
													);
												}}
											</form.Field>
										</div>
									))}

									<Button
										type="button"
										variant="outline"
										onClick={() =>
											field.pushValue({ name: "", quantity: 1, notes: "" })
										}
									>
										<Plus className="mr-2 h-4 w-4" />
										Agregar elemento incluido
									</Button>
								</div>
							)}
						</form.Field>
					</div>
				</FieldGroup>
			</form>

			<div className="flex gap-4 pt-6 justify-end">
				<Button type="button" variant="outline" onClick={onCancel}>
					{cancelLabel}
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isSubmitting]}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || !hasChanges || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}

function areEqual<T>(left: T, right: T) {
	return JSON.stringify(left) === JSON.stringify(right);
}

function getDirtyValues(
	values: ProductTypeFormValues,
	defaultValues: ProductTypeFormValues,
): Partial<ProductTypeFormValues> {
	const dirtyValues: Partial<ProductTypeFormValues> = {};

	if (!areEqual(values.categoryId, defaultValues.categoryId)) {
		dirtyValues.categoryId = values.categoryId;
	}

	if (!areEqual(values.billingUnitId, defaultValues.billingUnitId)) {
		dirtyValues.billingUnitId = values.billingUnitId;
	}

	if (!areEqual(values.name, defaultValues.name)) {
		dirtyValues.name = values.name;
	}

	if (!areEqual(values.imageUrl, defaultValues.imageUrl)) {
		dirtyValues.imageUrl = values.imageUrl;
	}

	if (!areEqual(values.description, defaultValues.description)) {
		dirtyValues.description = values.description;
	}

	if (!areEqual(values.kind, defaultValues.kind)) {
		dirtyValues.kind = values.kind;
	}

	if (!areEqual(values.trackingMode, defaultValues.trackingMode)) {
		dirtyValues.trackingMode = values.trackingMode;
	}

	if (
		!areEqual(
			values.excludeFromNewArrivals,
			defaultValues.excludeFromNewArrivals,
		)
	) {
		dirtyValues.excludeFromNewArrivals = values.excludeFromNewArrivals;
	}

	if (!areEqual(values.attributes, defaultValues.attributes)) {
		dirtyValues.attributes = values.attributes;
	}

	if (!areEqual(values.includedItems, defaultValues.includedItems)) {
		dirtyValues.includedItems = values.includedItems;
	}

	return dirtyValues;
}
