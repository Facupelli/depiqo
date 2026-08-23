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
import { Plus, Trash2 } from "lucide-react";
import { CatalogImageUploader } from "@/shared/components/catalog-image-uploader";
import type { CreateProductSubmissionError } from "./create-product.errors";
import {
	type CreateProductFormValues,
	createEmptyProductUnit,
	createProductFormDefaultValues,
	createProductFormSchema,
} from "./create-product.schema";

interface SelectOption {
	id: string;
	name: string;
}

interface SelectItemOption {
	value: string;
	label: string;
}

const TENANT_OWNER_VALUE = "tenant-owned";

interface CreateProductFormProps {
	formId: string;
	defaultValues?: CreateProductFormValues;
	categories: SelectOption[];
	branches: SelectOption[];
	owners?: SelectOption[];
	isPending: boolean;
	submitError?: CreateProductSubmissionError | null;
	onClearSubmitError?: () => void;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreateProductFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function CreateProductForm({
	formId,
	defaultValues = createProductFormDefaultValues(),
	categories,
	branches,
	owners = [],
	isPending,
	submitError,
	onClearSubmitError,
	submitLabel = "Crear producto",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateProductFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createProductFormSchema,
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
	const ownerItems: SelectItemOption[] = owners.map((owner) => ({
		value: owner.id,
		label: owner.name,
	}));
	const shouldShowOwnerColumn = ownerItems.length > 0;

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
									const nameServerError =
										submitError?.kind === "field" &&
										submitError.field === "name"
											? submitError.message
											: null;

									return (
										<Field data-invalid={isInvalid || nameServerError != null}>
											<FieldLabel htmlFor={field.name}>
												Nombre del producto
											</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												type="text"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) => {
													if (nameServerError) {
														onClearSubmitError?.();
													}
													field.handleChange(event.target.value);
												}}
												aria-invalid={isInvalid || nameServerError != null}
												placeholder="Ej. Cámara Sony FX3"
											/>
											{isInvalid ? (
												<FieldError errors={field.state.meta.errors} />
											) : nameServerError ? (
												<p className="text-sm text-destructive">
													{nameServerError}
												</p>
											) : null}
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
												onValueChange={(value) => {
													field.handleChange(
														value === "sin-categoria" || value == null
															? ""
															: value,
													);
												}}
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
												placeholder="Información corta para identificar el producto."
												className="min-h-16 bg-white"
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
										<FieldLabel>Imagen del producto</FieldLabel>
										<p className="mt-1 text-muted-foreground text-sm">
											La imagen es clave para que el producto se reconozca
											rápido en el catálogo.
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
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<p className="font-medium text-foreground text-sm">
								Unidades de equipo iniciales
							</p>
							<p className="mt-1 max-w-2xl text-muted-foreground text-sm">
								Puedes crear el producto ahora y cargar las unidades físicas más
								tarde. Si agregas unidades, sus sucursales definirán dónde
								quedará disponible este producto inicialmente.
							</p>
						</div>
						<form.Field name="units" mode="array">
							{(field) => (
								<Button
									type="button"
									variant="outline"
									onClick={() => field.pushValue(createEmptyProductUnit())}
								>
									<Plus className="mr-2 h-4 w-4" />
									Agregar unidad
								</Button>
							)}
						</form.Field>
					</div>

					<form.Field name="units" mode="array">
						{(field) =>
							field.state.value.length === 0 ? (
								<div className="rounded-xl border border-dashed p-6 text-sm">
									<p className="font-medium text-foreground">
										No agregaste unidades todavía.
									</p>
									<p className="mt-1 text-muted-foreground">
										Podrás cargar unidades físicas después de crear el producto.
									</p>
								</div>
							) : (
								<div className="rounded-sm border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead className="min-w-52">Sucursal</TableHead>
												<TableHead className="min-w-44">
													Número de serie
												</TableHead>
												{shouldShowOwnerColumn && (
													<TableHead className="min-w-44">Dueño</TableHead>
												)}
												<TableHead className="min-w-56">Notas</TableHead>
												<TableHead className="w-12" />
											</TableRow>
										</TableHeader>
										<TableBody>
											{field.state.value.map((unit, index) => (
												<TableRow
													key={`${unit.branchId}-${unit.serialNumber}-${index}`}
												>
													<TableCell>
														<form.Field name={`units[${index}].branchId`}>
															{(subField) => {
																const isInvalid =
																	subField.state.meta.isTouched &&
																	!subField.state.meta.isValid;

																return (
																	<Field data-invalid={isInvalid}>
																		<Select
																			items={branchItems}
																			value={subField.state.value}
																			onValueChange={(value) => {
																				subField.handleChange(value ?? "");
																			}}
																		>
																			<SelectTrigger aria-invalid={isInvalid}>
																				<SelectValue placeholder="Selecciona una sucursal" />
																			</SelectTrigger>
																			<SelectContent>
																				{branchItems.map((item) => (
																					<SelectItem
																						key={item.value}
																						value={item.value}
																					>
																						{item.label}
																					</SelectItem>
																				))}
																			</SelectContent>
																		</Select>
																		{isInvalid && (
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
														<form.Field name={`units[${index}].serialNumber`}>
															{(subField) => (
																<Input
																	type="text"
																	value={subField.state.value}
																	onBlur={subField.handleBlur}
																	onChange={(event) =>
																		subField.handleChange(event.target.value)
																	}
																	placeholder="Opcional"
																/>
															)}
														</form.Field>
													</TableCell>

													{shouldShowOwnerColumn && (
														<TableCell>
															<form.Field name={`units[${index}].ownerId`}>
																{(subField) => (
																	<Select
																		items={ownerItems}
																		value={
																			subField.state.value || TENANT_OWNER_VALUE
																		}
																		onValueChange={(value) => {
																			subField.handleChange(
																				value === TENANT_OWNER_VALUE ||
																					value == null
																					? ""
																					: value,
																			);
																		}}
																	>
																		<SelectTrigger>
																			<SelectValue placeholder="Selecciona un dueño" />
																		</SelectTrigger>
																		<SelectContent>
																			<SelectItem value={TENANT_OWNER_VALUE}>
																				Propiedad del tenant
																			</SelectItem>
																			{ownerItems.map((item) => (
																				<SelectItem
																					key={item.value}
																					value={item.value}
																				>
																					{item.label}
																				</SelectItem>
																			))}
																		</SelectContent>
																	</Select>
																)}
															</form.Field>
														</TableCell>
													)}

													<TableCell>
														<form.Field name={`units[${index}].notes`}>
															{(subField) => (
																<Input
																	type="text"
																	value={subField.state.value}
																	onBlur={subField.handleBlur}
																	onChange={(event) =>
																		subField.handleChange(event.target.value)
																	}
																	placeholder="Opcional"
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
															aria-label={`Eliminar unidad ${index + 1}`}
														>
															<Trash2 className="h-4 w-4" />
														</Button>
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							)
						}
					</form.Field>
				</section>
			</form>

			<div className="sticky bottom-0 mt-10 flex justify-end gap-4 border-t bg-background/95 py-4 backdrop-blur supports-backdrop-filter:bg-background/80">
				{submitError?.kind === "form" && (
					<p className="mr-auto self-center text-sm text-destructive">
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
