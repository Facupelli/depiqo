import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { useSelector } from "@tanstack/react-form";
import { Loader2, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/public";
import { withFieldGroup } from "@/shared/contexts/form.context";
import useDebounce from "@/shared/hooks/use-debounce";

const EQUIPMENT_SEARCH_LIMIT = 15;

function comboFormDefaultValues() {
	return {
		requirements: [] as Array<{
			equipmentTypeId: string;
			equipmentTypeName: string;
			quantityPerItem: number;
		}>,
	};
}

function areStringArraysEqual(previous: string[], next: string[]) {
	return (
		previous.length === next.length &&
		previous.every((value, index) => value === next[index])
	);
}

export const ComboRequirementEditor = withFieldGroup({
	defaultValues: comboFormDefaultValues(),
	render: function Render({ group: form }) {
		const equipmentSearchId = useId();
		const [equipmentSearch, setEquipmentSearch] = useState("");
		const debouncedEquipmentSearch = useDebounce(equipmentSearch, 300);
		const selectedEquipmentTypeIds = useSelector(
			form.store,
			(state) =>
				state.values.requirements.map(
					(requirement) => requirement.equipmentTypeId,
				),
			{ compare: areStringArraysEqual },
		);
		const equipmentQuery = useEquipmentTypeOptions({
			search: debouncedEquipmentSearch.trim() || undefined,
			limit: EQUIPMENT_SEARCH_LIMIT,
			excludeIds: selectedEquipmentTypeIds,
		});
		const isSearchDebouncing =
			equipmentSearch.trim() !== debouncedEquipmentSearch.trim();

		return (
			<section className="space-y-5 border-t pt-8">
				<div>
					<h2 className="font-semibold text-lg">Equipos del combo</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Agrega al menos un equipo y define cuántas unidades incluye.
					</p>
				</div>
				<form.Field name="requirements" mode="array">
					{(field) => {
						const invalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<div className="space-y-5">
								<div className="space-y-4 rounded-xl border bg-muted/20 p-4">
									<Field>
										<FieldLabel htmlFor={equipmentSearchId}>
											Buscar equipo
										</FieldLabel>
										<Input
											id={equipmentSearchId}
											name="equipmentSearch"
											type="search"
											autoComplete="off"
											value={equipmentSearch}
											onChange={(event) =>
												setEquipmentSearch(event.target.value)
											}
											placeholder="Ej. cámara, trípode, micrófono"
										/>
									</Field>
									<Field>
										<FieldLabel>Resultados</FieldLabel>
										<div className="h-56 overflow-y-auto rounded-md border bg-background">
											{isSearchDebouncing || equipmentQuery.isFetching ? (
												<SearchState>
													<Loader2 className="size-3.5 animate-spin" />
													Buscando equipos...
												</SearchState>
											) : equipmentQuery.isError ? (
												<SearchState error>
													No pudimos buscar equipos. Intenta nuevamente.
												</SearchState>
											) : !equipmentQuery.data?.length ? (
												<SearchState>No encontramos equipos.</SearchState>
											) : (
												<ul className="divide-y">
													{equipmentQuery.data.map((equipmentType) => (
														<li
															key={equipmentType.id}
															className="flex min-h-12 items-center gap-3 px-3 py-2 hover:bg-muted/50"
														>
															<span className="min-w-0 flex-1 text-sm">
																{equipmentType.name}
															</span>
															<Button
																type="button"
																variant="outline"
																size="sm"
																onClick={() => {
																	if (
																		!field.state.value.some(
																			(item) =>
																				item.equipmentTypeId ===
																				equipmentType.id,
																		)
																	) {
																		field.pushValue({
																			equipmentTypeId: equipmentType.id,
																			equipmentTypeName: equipmentType.name,
																			quantityPerItem: 1,
																		});
																	}
																}}
															>
																Añadir
															</Button>
														</li>
													))}
												</ul>
											)}
										</div>
									</Field>
								</div>
								<div className="space-y-3">
									<h3 className="font-medium text-sm">Equipos añadidos</h3>
									{field.state.value.length === 0 ? (
										<div className="rounded-xl border border-dashed p-6 text-sm">
											<p className="font-medium">
												Todavía no agregaste equipos.
											</p>
											<p className="mt-1 text-muted-foreground">
												Busca y agrega al menos un equipo para completar el
												combo.
											</p>
										</div>
									) : (
										<div className="divide-y rounded-xl border">
											{field.state.value.map((requirement, index) => (
												<div
													key={requirement.equipmentTypeId}
													className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
												>
													<p className="min-w-0 font-medium text-sm">
														{requirement.equipmentTypeName}
													</p>
													<form.Field
														name={`requirements[${index}].quantityPerItem`}
													>
														{(quantityField) => {
															const quantityInvalid =
																quantityField.state.meta.isTouched &&
																!quantityField.state.meta.isValid;
															return (
																<Field
																	data-invalid={quantityInvalid}
																	className="grid grid-cols-[auto_5rem] items-center gap-2"
																>
																	<FieldLabel htmlFor={quantityField.name}>
																		Cantidad
																	</FieldLabel>
																	<Input
																		id={quantityField.name}
																		name={quantityField.name}
																		type="number"
																		min={1}
																		step={1}
																		value={quantityField.state.value}
																		onBlur={quantityField.handleBlur}
																		onChange={(event) => {
																			const value = event.target.valueAsNumber;
																			quantityField.handleChange(
																				Number.isNaN(value) || value < 1
																					? 1
																					: value,
																			);
																		}}
																		aria-invalid={quantityInvalid}
																	/>
																	{quantityInvalid && (
																		<FieldError
																			errors={quantityField.state.meta.errors}
																			className="col-span-2"
																		/>
																	)}
																</Field>
															);
														}}
													</form.Field>
													<Button
														type="button"
														variant="ghost"
														className="justify-self-start text-muted-foreground"
														onClick={() => field.removeValue(index)}
													>
														<Trash2 className="size-4" />
														Eliminar
													</Button>
												</div>
											))}
										</div>
									)}
								</div>
								{invalid && <FieldError errors={field.state.meta.errors} />}
							</div>
						);
					}}
				</form.Field>
			</section>
		);
	},
});

function SearchState({
	children,
	error = false,
}: {
	children: React.ReactNode;
	error?: boolean;
}) {
	return (
		<p
			className={`flex h-full items-center justify-center gap-2 px-4 text-center text-sm ${error ? "text-destructive" : "text-muted-foreground"}`}
		>
			{children}
		</p>
	);
}
