import { useForm } from "@tanstack/react-form";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
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
import {
	type AddAssetsToEquipmentTypeFormValues,
	addAssetsToEquipmentTypeFormDefaultValues,
	addAssetsToEquipmentTypeFormSchema,
	createEmptyEquipmentTypeAsset,
} from "./add-assets-to-equipment-type.schema";

interface SelectOption {
	id: string;
	name: string;
}

const TENANT_OWNER_VALUE = "tenant-owned";

interface AddAssetsToEquipmentTypeFormProps {
	formId: string;
	branches: SelectOption[];
	owners: SelectOption[];
	defaultValues?: AddAssetsToEquipmentTypeFormValues;
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (
		values: AddAssetsToEquipmentTypeFormValues,
	) => Promise<void> | void;
	onCancel: () => void;
}

export function AddAssetsToEquipmentTypeForm({
	formId,
	branches,
	owners,
	defaultValues = addAssetsToEquipmentTypeFormDefaultValues(),
	isPending,
	submitLabel = "Agregar assets",
	pendingLabel = "Agregando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: AddAssetsToEquipmentTypeFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: addAssetsToEquipmentTypeFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const branchItems = branches.map((branch) => ({
		value: branch.id,
		label: branch.name,
	}));
	const ownerItems = owners.map((owner) => ({
		value: owner.id,
		label: owner.name,
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
				className="space-y-5"
			>
				<form.Field name="assets" mode="array">
					{(field) => (
						<div className="flex justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={() => field.pushValue(createEmptyEquipmentTypeAsset())}
							>
								<Plus className="mr-2 h-4 w-4" />
								Agregar otra fila
							</Button>
						</div>
					)}
				</form.Field>

				<form.Field name="assets" mode="array">
					{(field) => (
						<div className="overflow-hidden rounded-md border">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead className="min-w-52">Sucursal</TableHead>
										<TableHead className="min-w-52">Propietario</TableHead>
										<TableHead className="min-w-44">Número de serie</TableHead>
										<TableHead className="min-w-56">Notas</TableHead>
										<TableHead className="w-12" />
									</TableRow>
								</TableHeader>
								<TableBody>
									{field.state.value.map((asset, index) => (
										<TableRow
											key={`${asset.branchId}-${asset.serialNumber}-${index}`}
										>
											<TableCell>
												<form.Field name={`assets[${index}].branchId`}>
													{(subField) => {
														const isInvalid =
															subField.state.meta.isTouched &&
															!subField.state.meta.isValid;

														return (
															<Field data-invalid={isInvalid}>
																<FieldLabel className="sr-only">
																	Sucursal
																</FieldLabel>
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
												<form.Field name={`assets[${index}].ownerId`}>
													{(subField) => {
														const isInvalid =
															subField.state.meta.isTouched &&
															!subField.state.meta.isValid;

														return (
															<Field data-invalid={isInvalid}>
																<FieldLabel className="sr-only">
																	Propietario
																</FieldLabel>
																<Select
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
																	items={ownerItems}
																>
																	<SelectTrigger aria-invalid={isInvalid}>
																		<SelectValue placeholder="Selecciona propietario" />
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
												<form.Field name={`assets[${index}].serialNumber`}>
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
												<form.Field name={`assets[${index}].notes`}>
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
													disabled={field.state.value.length <= 1}
													aria-label={`Eliminar asset ${index + 1}`}
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
				</form.Field>
			</form>

			<div className="flex justify-end gap-3 border-t pt-4">
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
							disabled={!canSubmit || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
