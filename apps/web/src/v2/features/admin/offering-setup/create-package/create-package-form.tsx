import { useForm } from "@tanstack/react-form";
import { Trash2 } from "lucide-react";
import { useId } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { CatalogImageUploader } from "@/features/catalog/components/catalog-image-uploader";
import {
	type CreatePackageFormValues,
	createPackageFormDefaults,
	createPackageFormSchema,
} from "./create-package.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface SelectItemOption {
	value: string;
	label: string;
}

interface CreatePackageFormProps {
	formId: string;
	defaultValues?: CreatePackageFormValues;
	categories: SelectOption[];
	branches: SelectOption[];
	equipmentTypes: SelectOption[];
	equipmentSearch: string;
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onEquipmentSearchChange: (search: string) => void;
	onSubmit: (values: CreatePackageFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function CreatePackageForm({
	formId,
	defaultValues = createPackageFormDefaults,
	categories,
	branches,
	equipmentTypes,
	equipmentSearch,
	isPending,
	submitLabel = "Crear combo",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onEquipmentSearchChange,
	onSubmit,
	onCancel,
}: CreatePackageFormProps) {
	const equipmentSearchId = useId();
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createPackageFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const categoryItems: SelectItemOption[] = [
		{ value: "sin-categoria", label: "Sin categoría" },
		...categories.map((category) => ({
			value: category.id,
			label: category.name,
		})),
	];
	const branchItems: SelectItemOption[] = branches.map((branch) => ({
		value: branch.id,
		label: branch.name,
	}));
	const equipmentItems: SelectItemOption[] = equipmentTypes.map(
		(equipmentType) => ({
			value: equipmentType.id,
			label: equipmentType.name,
		}),
	);

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
												Nombre del combo
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={isInvalid}
												placeholder="Ej. Combo producción audiovisual"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="categoryId">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Categoría</FieldLabel>
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
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
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
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={isInvalid}
												placeholder="Qué incluye este combo y para qué tipo de alquiler sirve."
												className="min-h-16"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>
						</FieldGroup>
					</div>

					<form.Field name="imageUrl">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid} className="self-start">
									<div>
										<FieldLabel>Imagen del combo</FieldLabel>
										<p className="mt-1 text-muted-foreground text-sm">
											Usa una imagen que represente el conjunto completo.
										</p>
									</div>
									<CatalogImageUploader
										currentPath={field.state.value}
										onUploadComplete={(path) => field.handleChange(path)}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</section>

				<section className="space-y-5 border-t pt-8">
					<div>
						<p className="font-medium text-foreground text-sm">
							Sucursales disponibles
						</p>
						<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
							Selecciona las sucursales donde este combo estará disponible para
							alquilar.
						</p>
					</div>
					<form.Field name="branchIds">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
										{branchItems.map((branch) => {
											const isChecked = field.state.value.includes(
												branch.value,
											);

											return (
												<div
													key={branch.value}
													className="flex items-center gap-3 rounded-lg border p-3 text-sm"
												>
													<Checkbox
														checked={isChecked}
														onCheckedChange={(checked) => {
															field.handleChange(
																checked
																	? [...field.state.value, branch.value]
																	: field.state.value.filter(
																			(id) => id !== branch.value,
																		),
															);
														}}
													/>
													<span>{branch.label}</span>
												</div>
											);
										})}
									</div>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</section>

				<section className="space-y-5 border-t pt-8">
					<div>
						<p className="font-medium text-foreground text-sm">
							Equipos incluidos
						</p>
						<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
							Busca el equipo que quieres incluir. Si necesitas más unidades del
							mismo equipo, aumenta la cantidad.
						</p>
					</div>

					<form.Field name="requirements" mode="array">
						{(field) => {
							const selectedIds = new Set(
								field.state.value.map(
									(requirement) => requirement.equipmentTypeId,
								),
							);
							const availableEquipmentItems = equipmentItems.filter(
								(item) => !selectedIds.has(item.value),
							);
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<div className="space-y-4">
									<div className="grid gap-3 rounded-xl border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
												items={availableEquipmentItems}
												value=""
												onValueChange={(value) => {
													if (!value || selectedIds.has(value)) return;
													const equipmentType = equipmentItems.find(
														(item) => item.value === value,
													);

													if (!equipmentType) return;

													field.pushValue({
														equipmentTypeId: value,
														equipmentTypeName: equipmentType.label,
														quantityPerItem: 1,
													});
												}}
											>
												<SelectTrigger>
													<SelectValue placeholder="Agregar equipo al combo" />
												</SelectTrigger>
												<SelectContent>
													{availableEquipmentItems.map((item) => (
														<SelectItem key={item.value} value={item.value}>
															{item.label}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</Field>
									</div>

									{field.state.value.length === 0 ? (
										<div className="rounded-xl border border-dashed p-6 text-sm">
											<p className="font-medium text-foreground">
												Todavía no agregaste equipos.
											</p>
											<p className="mt-1 text-muted-foreground">
												Busca y agrega al menos un equipo para crear el combo.
											</p>
										</div>
									) : (
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
															<TableCell>
																{requirement.equipmentTypeName}
															</TableCell>
															<TableCell>
																<form.Field
																	name={`requirements[${index}].quantityPerItem`}
																>
																	{(subField) => {
																		const subFieldInvalid =
																			subField.state.meta.isTouched &&
																			!subField.state.meta.isValid;

																		return (
																			<Field data-invalid={subFieldInvalid}>
																				<Input
																					type="number"
																					min={1}
																					step={1}
																					value={subField.state.value}
																					onBlur={subField.handleBlur}
																					onChange={(event) =>
																						subField.handleChange(
																							event.target.valueAsNumber,
																						)
																					}
																					aria-invalid={subFieldInvalid}
																				/>
																				{subFieldInvalid && (
																					<FieldError
																						errors={subField.state.meta.errors}
																					/>
																				)}
																			</Field>
																		);
																	}}
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
																	<Trash2 className="h-4 w-4" />
																</Button>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</div>
									)}
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</div>
							);
						}}
					</form.Field>
				</section>
			</form>

			<div className="sticky bottom-0 mt-10 flex justify-end gap-4 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
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
