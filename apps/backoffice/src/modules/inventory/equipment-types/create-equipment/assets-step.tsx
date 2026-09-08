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
import { Plus, Trash2 } from "lucide-react";
import { withForm } from "@/shared/contexts/form.context";
import {
	createEmptyAsset,
	createEquipmentFormDefaultValues,
} from "./create-equipment.schema";
import { WizardStepHeading } from "./wizard-step-heading";

interface SelectOption {
	value: string;
	label: string;
}

const tenantOwnerValue = "tenant-owned";

export const AssetsStep = withForm({
	defaultValues: createEquipmentFormDefaultValues(),
	props: {
		branchItems: [] as SelectOption[],
		ownerItems: [] as SelectOption[],
	},
	render: function Render({ form, branchItems, ownerItems }) {
		return (
			<section className="space-y-6">
				<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
					<WizardStepHeading
						title="Unidades"
						description="Agrega unidades físicas ahora o continúa sin unidades."
					/>
					<form.Field name="assets" mode="array">
						{(field) => (
							<Button
								type="button"
								variant="outline"
								onClick={() => field.pushValue(createEmptyAsset())}
							>
								<Plus className="mr-2 size-4" />
								Agregar unidad
							</Button>
						)}
					</form.Field>
				</div>
				<form.Field name="assets" mode="array">
					{(field) =>
						field.state.value.length === 0 ? (
							<div className="rounded-xl border border-dashed p-6">
								<p className="font-medium text-sm">0 unidades</p>
								<p className="mt-1 text-muted-foreground text-sm">
									Podrás cargar unidades físicas después de crear el equipo.
								</p>
							</div>
						) : (
							<div className="space-y-3">
								{field.state.value.map((asset, index) => (
									<div
										key={asset.draftId}
										className="grid gap-4 rounded-xl border p-4 md:grid-cols-2 xl:grid-cols-[1.2fr_1.2fr_1fr_1.2fr_auto] xl:items-start"
									>
										<form.Field name={`assets[${index}].branchId`}>
											{(subField) => {
												const isInvalid =
													subField.state.meta.isTouched &&
													!subField.state.meta.isValid;
												return (
													<Field data-invalid={isInvalid}>
														<FieldLabel htmlFor={subField.name}>
															Sucursal
														</FieldLabel>
														<Select
															items={branchItems}
															value={subField.state.value}
															onValueChange={(value) =>
																subField.handleChange(value ?? "")
															}
														>
															<SelectTrigger
																id={subField.name}
																name={subField.name}
																aria-invalid={isInvalid}
															>
																<SelectValue placeholder="Selecciona" />
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
															<FieldError errors={subField.state.meta.errors} />
														)}
													</Field>
												);
											}}
										</form.Field>
										<form.Field name={`assets[${index}].serialNumber`}>
											{(subField) => (
												<Field>
													<FieldLabel htmlFor={subField.name}>
														Referencia / número de serie
													</FieldLabel>
													<Input
														id={subField.name}
														name={subField.name}
														value={subField.state.value}
														onBlur={subField.handleBlur}
														onChange={(event) =>
															subField.handleChange(event.target.value)
														}
														aria-invalid={false}
														placeholder="Opcional"
													/>
												</Field>
											)}
										</form.Field>
										<form.Field name={`assets[${index}].ownerId`}>
											{(subField) => (
												<Field>
													<FieldLabel htmlFor={subField.name}>
														Propietario
													</FieldLabel>
													<Select
														items={ownerItems}
														value={subField.state.value || tenantOwnerValue}
														onValueChange={(value) =>
															subField.handleChange(
																value === tenantOwnerValue || value == null
																	? ""
																	: value,
															)
														}
													>
														<SelectTrigger
															id={subField.name}
															name={subField.name}
															aria-invalid={false}
														>
															<SelectValue />
														</SelectTrigger>
														<SelectContent>
															<SelectItem value={tenantOwnerValue}>
																Propio
															</SelectItem>
															{ownerItems.map((item) => (
																<SelectItem key={item.value} value={item.value}>
																	{item.label}
																</SelectItem>
															))}
														</SelectContent>
													</Select>
												</Field>
											)}
										</form.Field>
										<form.Field name={`assets[${index}].notes`}>
											{(subField) => (
												<Field>
													<FieldLabel htmlFor={subField.name}>Notas</FieldLabel>
													<Input
														id={subField.name}
														name={subField.name}
														value={subField.state.value}
														onBlur={subField.handleBlur}
														onChange={(event) =>
															subField.handleChange(event.target.value)
														}
														aria-invalid={false}
														placeholder="Opcional"
													/>
												</Field>
											)}
										</form.Field>
										<Button
											type="button"
											variant="ghost"
											size="icon"
											className="justify-self-end md:col-start-2 xl:col-start-auto xl:mt-6"
											onClick={() => field.removeValue(index)}
											aria-label={`Eliminar unidad ${index + 1}`}
										>
											<Trash2 className="size-4" />
										</Button>
									</div>
								))}
							</div>
						)
					}
				</form.Field>
			</section>
		);
	},
});
