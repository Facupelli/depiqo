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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";
import { useForm } from "@tanstack/react-form";
import { Trash2 } from "lucide-react";
import { useId } from "react";
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import {
	type EditProductFormValues,
	editProductFormSchema,
} from "./edit-product.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface EditProductFormProps {
	formId: string;
	defaultValues: EditProductFormValues;
	categories: SelectOption[];
	isCategoriesLoading?: boolean;
	equipmentTypes: SelectOption[];
	equipmentSearch: string;
	isPending: boolean;
	onEquipmentSearchChange: (search: string) => void;
	onSubmit: (values: EditProductFormValues) => Promise<void>;
	onCancel: () => void;
}

export function EditProductForm({
	formId,
	defaultValues,
	categories,
	isCategoriesLoading = false,
	equipmentTypes,
	equipmentSearch,
	isPending,
	onEquipmentSearchChange,
	onSubmit,
	onCancel,
}: EditProductFormProps) {
	const equipmentSearchId = useId();
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: editProductFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});
	const categoryItems = [
		{ value: "sin-categoria", label: "Sin categoría" },
		...categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];

	return (
		<>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-12"
			>
				<section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
					<div className="space-y-6">
						<FieldGroup className="grid gap-5">
							<form.Field name="name">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>
												Nombre del producto
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={isInvalid}
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="categoryId">
								{(field) => (
									<Field>
										<FieldLabel>Categoría</FieldLabel>
										{isCategoriesLoading ? (
											<Skeleton className="h-9 w-full" />
										) : (
											<Select
												items={categoryItems}
												value={field.state.value || "sin-categoria"}
												onValueChange={(value) =>
													field.handleChange(
														value === "sin-categoria" || value == null
															? ""
															: value,
													)
												}
											>
												<SelectTrigger>
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
									</Field>
								)}
							</form.Field>

							<form.Field name="description">
								{(field) => (
									<Field>
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
											placeholder="Información corta para identificar el producto."
											className="min-h-16 bg-white"
										/>
									</Field>
								)}
							</form.Field>
						</FieldGroup>
					</div>

					<form.Field name="imageUrl">
						{(field) => (
							<Field className="self-start">
								<div>
									<FieldLabel>Imagen del producto</FieldLabel>
									<p className="mt-1 text-muted-foreground text-sm">
										La imagen ayuda a reconocer el producto rápidamente en el
										catálogo.
									</p>
								</div>
								<CatalogImageUploader
									currentPath={field.state.value}
									onUploadComplete={(path) => field.handleChange(path)}
								/>
							</Field>
						)}
					</form.Field>
				</section>

				<section className="space-y-5 border-t pt-8">
					<div>
						<p className="font-medium text-foreground text-sm">
							Equipo requerido
						</p>
						<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
							Define el equipo necesario para poder cumplir el alquiler de este
							producto.
						</p>
					</div>
					<form.Field name="requirements" mode="array">
						{(field) => {
							const selectedIds = new Set(
								field.state.value.map(
									(requirement) => requirement.equipmentTypeId,
								),
							);
							const availableEquipmentTypes = equipmentTypes.filter(
								(equipmentType) => !selectedIds.has(equipmentType.id),
							);
							return (
								<div className="space-y-4">
									<div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-2">
										<Field>
											<FieldLabel htmlFor={equipmentSearchId}>
												Buscar equipo
											</FieldLabel>
											<Input
												id={equipmentSearchId}
												value={equipmentSearch}
												onChange={(event) =>
													onEquipmentSearchChange(event.target.value)
												}
												placeholder="Ej. cámara, trípode, micrófono"
											/>
										</Field>
										<Field>
											<FieldLabel>Resultados</FieldLabel>
											<Select
												items={availableEquipmentTypes.map((equipmentType) => ({
													value: equipmentType.id,
													label: equipmentType.name,
												}))}
												value=""
												onValueChange={(value) => {
													const equipmentType = availableEquipmentTypes.find(
														(item) => item.id === value,
													);
													if (!equipmentType) return;
													field.pushValue({
														equipmentTypeId: equipmentType.id,
														equipmentTypeName: equipmentType.name,
														quantityPerItem: 1,
													});
												}}
											>
												<SelectTrigger>
													<SelectValue placeholder="Agregar equipo requerido" />
												</SelectTrigger>
												<SelectContent>
													{availableEquipmentTypes.map((equipmentType) => (
														<SelectItem
															key={equipmentType.id}
															value={equipmentType.id}
														>
															{equipmentType.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
									</div>

									<div className="rounded-sm border">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>Equipo</TableHead>
													<TableHead className="w-40">Cantidad</TableHead>
													<TableHead className="w-12" />
												</TableRow>
											</TableHeader>
											<TableBody>
												{field.state.value.map((requirement, index) => (
													<TableRow key={requirement.equipmentTypeId}>
														<TableCell className="font-medium">
															{requirement.equipmentTypeName}
														</TableCell>
														<TableCell>
															<form.Field
																name={`requirements[${index}].quantityPerItem`}
															>
																{(subField) => (
																	<Input
																		type="number"
																		min={1}
																		step={1}
																		value={subField.state.value}
																		onBlur={subField.handleBlur}
																		onChange={(event) => {
																			const value = event.target.valueAsNumber;
																			subField.handleChange(
																				Number.isNaN(value)
																					? 1
																					: Math.max(1, value),
																			);
																		}}
																		aria-label={`Cantidad de ${requirement.equipmentTypeName}`}
																	/>
																)}
															</form.Field>
														</TableCell>
														<TableCell>
															<Button
																type="button"
																variant="ghost"
																size="icon"
																onClick={() => field.removeValue(index)}
																aria-label={`Eliminar equipo ${index + 1}`}
															>
																<Trash2 className="size-4" />
															</Button>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								</div>
							);
						}}
					</form.Field>
				</section>
			</form>

			<div className="sticky bottom-0 mt-10 flex justify-end gap-4 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
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
