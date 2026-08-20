import { Button } from "@repo/ui/components/button";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { useForm } from "@tanstack/react-form";
import { Minus, Plus } from "lucide-react";
import { useId } from "react";
import type { AssignRentalAccessoriesUiError } from "./assign-rental-accessories.errors";
import {
	formatAccessoryAvailabilityMessage,
	formatSharedAccessoryAllocationMessage,
	formatSharedAccessoryAvailability,
	formatSharedAccessoryPoolConflictMessage,
} from "./rental-accessory-assignment.messages";
import {
	type RentalAccessoryAssignmentFormValues,
	rentalAccessoryAssignmentFormSchema,
} from "./rental-accessory-assignment.schema";
import {
	createRentalAccessoryAssignmentKey,
	createSharedAccessoryPoolStates,
} from "./rental-accessory-assignment.utils";

interface RentalAccessoryAssignmentFormProps {
	defaultValues: RentalAccessoryAssignmentFormValues;
	sharedCapacityByEquipmentType: ReadonlyMap<string, number>;
	isPending: boolean;
	error?: AssignRentalAccessoriesUiError;
	onSubmit: (
		values: RentalAccessoryAssignmentFormValues,
	) => Promise<void> | void;
	onCancel: () => void;
	onAccessoryQuantityChange: () => void;
}

export function RentalAccessoryAssignmentForm({
	defaultValues,
	sharedCapacityByEquipmentType,
	isPending,
	error,
	onSubmit,
	onCancel,
	onAccessoryQuantityChange,
}: RentalAccessoryAssignmentFormProps) {
	const formId = useId();

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: rentalAccessoryAssignmentFormSchema,
		},
		onSubmit: async ({ value }) => {
			const poolStates = createSharedAccessoryPoolStates(
				value,
				sharedCapacityByEquipmentType,
			);
			if ([...poolStates.values()].some((pool) => pool.isOverCapacity)) {
				return;
			}

			await onSubmit(value);
		},
	});

	return (
		<>
			<form
				id={formId}
				className="space-y-5"
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
			>
				{error ? (
					<div
						className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-950 text-sm"
						role="alert"
					>
						{error.message}
					</div>
				) : null}

				<form.Subscribe selector={(state) => state.values}>
					{(values) => {
						const poolStates = createSharedAccessoryPoolStates(
							values,
							sharedCapacityByEquipmentType,
						);
						const sharedEquipmentTypeIds = new Set<string>();
						const seenEquipmentTypeIds = new Set<string>();
						for (const group of values.groups) {
							for (const accessory of group.accessories) {
								if (seenEquipmentTypeIds.has(accessory.equipmentTypeId)) {
									sharedEquipmentTypeIds.add(accessory.equipmentTypeId);
								}
								seenEquipmentTypeIds.add(accessory.equipmentTypeId);
							}
						}

						return (
							<form.Field name="groups" mode="array">
								{(groupsField) => (
									<div className="space-y-5">
										{groupsField.state.value.map((group, groupIndex) => (
											<section
												key={group.sourceRentalDemandLineId}
												className="overflow-hidden rounded-md border border-neutral-200 bg-white"
											>
												<header className="border-neutral-200 border-b bg-neutral-50/80 px-4 py-3">
													<div className="flex items-center justify-between gap-3">
														<div className="min-w-0">
															<div className="flex items-center gap-2">
																<p className="truncate font-semibold text-neutral-950 text-sm">
																	{group.sourceEquipmentTypeName}
																</p>
																<span className="font-medium text-neutral-500 text-xs">
																	x{group.sourceQuantity}
																</span>
															</div>
															<p className="mt-0.5 text-neutral-500 text-xs">
																Equipo del rental
															</p>
														</div>
														<span className="shrink-0 rounded-md border border-neutral-200 bg-white px-2.5 py-1 font-medium text-neutral-600 text-xs">
															{group.accessories.length}{" "}
															{group.accessories.length === 1
																? "sugerencia"
																: "sugerencias"}
														</span>
													</div>
												</header>

												<div className="hidden grid-cols-[minmax(0,1fr)_120px_120px_150px] border-neutral-200 border-b bg-white px-4 py-2 text-neutral-500 text-xs md:grid">
													<p>Accesorio sugerido</p>
													<p className="text-center">Recomendado</p>
													<p className="text-center">Disponible</p>
													<p className="text-center">Cantidad</p>
												</div>

												<div className="divide-y divide-neutral-100">
													{group.accessories.map(
														(accessory, accessoryIndex) => {
															const rowKey = createRentalAccessoryAssignmentKey(
																{
																	sourceRentalDemandLineId:
																		group.sourceRentalDemandLineId,
																	equipmentTypeId: accessory.equipmentTypeId,
																},
															);
															const pool = poolStates.get(
																accessory.equipmentTypeId,
															);
															const isSharedPool = sharedEquipmentTypeIds.has(
																accessory.equipmentTypeId,
															);

															return (
																<div
																	key={rowKey}
																	className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_120px_120px_150px] md:items-center"
																>
																	<div className="min-w-0">
																		<p className="truncate font-medium text-neutral-950 text-sm">
																			{accessory.equipmentTypeName}
																		</p>
																	</div>

																	<div className="grid grid-cols-2 gap-3 md:contents">
																		<div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 md:block md:border-0 md:bg-transparent md:p-0 md:text-center">
																			<span className="text-neutral-500 text-xs md:hidden">
																				Recomendado
																			</span>
																			<span className="font-semibold text-neutral-950 tabular-nums">
																				{accessory.recommendedQuantity}
																			</span>
																		</div>
																		<div className="flex items-center justify-between rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 md:block md:border-0 md:bg-transparent md:p-0 md:text-center">
																			<span className="text-neutral-500 text-xs md:hidden">
																				Disponible
																			</span>
																			<span className="font-semibold text-neutral-950 tabular-nums">
																				{isSharedPool
																					? formatSharedAccessoryAvailability(
																							pool?.capacity ?? 0,
																						)
																					: (pool?.capacity ?? 0)}
																			</span>
																		</div>
																	</div>

																	<form.Field
																		name={`groups[${groupIndex}].accessories[${accessoryIndex}].quantity`}
																	>
																		{(quantityField) => {
																			const isInvalid =
																				quantityField.state.meta.isTouched &&
																				!quantityField.state.meta.isValid;
																			const quantity =
																				quantityField.state.value;
																			const max =
																				pool?.rowMaximumByKey.get(rowKey) ??
																				quantity;
																			const otherSources =
																				pool?.otherSelectedGroupsByRowKey.get(
																					rowKey,
																				) ?? [];
																			const sharedAllocationMessage =
																				!pool?.isOverCapacity && quantity >= max
																					? formatSharedAccessoryAllocationMessage(
																							{
																								capacity: pool?.capacity ?? 0,
																								otherSourceEquipmentTypeNames:
																									otherSources,
																							},
																						)
																					: undefined;

																			return (
																				<Field
																					data-invalid={
																						isInvalid ||
																						Boolean(pool?.isOverCapacity)
																					}
																					className="gap-1"
																				>
																					<FieldLabel className="text-neutral-500 text-xs md:hidden">
																						Cantidad
																					</FieldLabel>
																					<div className="flex w-fit items-center overflow-hidden rounded-md border border-neutral-200 bg-white md:mx-auto">
																						<Button
																							type="button"
																							variant="ghost"
																							size="icon-sm"
																							aria-label={`Restar ${accessory.equipmentTypeName} para ${group.sourceEquipmentTypeName}`}
																							className="rounded-none border-neutral-200 border-r"
																							disabled={
																								quantity <= 0 || isPending
																							}
																							onClick={() => {
																								onAccessoryQuantityChange();
																								quantityField.handleChange(
																									Math.max(0, quantity - 1),
																								);
																							}}
																						>
																							<Minus className="size-3.5" />
																						</Button>
																						<span className="min-w-10 text-center font-semibold text-neutral-950 text-sm tabular-nums">
																							{quantity}
																						</span>
																						<Button
																							type="button"
																							variant="ghost"
																							size="icon-sm"
																							aria-label={`Sumar ${accessory.equipmentTypeName} para ${group.sourceEquipmentTypeName}`}
																							className="rounded-none border-neutral-200 border-l"
																							disabled={
																								quantity >= max ||
																								pool?.isOverCapacity ||
																								isPending
																							}
																							onClick={() => {
																								onAccessoryQuantityChange();
																								quantityField.handleChange(
																									Math.min(max, quantity + 1),
																								);
																							}}
																						>
																							<Plus className="size-3.5" />
																						</Button>
																					</div>
																					{pool?.isOverCapacity ? (
																						<p
																							className="text-red-600 text-xs"
																							role="alert"
																						>
																							{formatSharedAccessoryPoolConflictMessage(
																								pool.capacity,
																							)}
																						</p>
																					) : null}
																					{sharedAllocationMessage ? (
																						<p className="text-amber-700 text-xs">
																							{sharedAllocationMessage}
																						</p>
																					) : null}
																					{!pool?.isOverCapacity &&
																					pool?.capacity === 0 ? (
																						<p
																							className="text-red-600 text-xs"
																							role="alert"
																						>
																							{formatAccessoryAvailabilityMessage(
																								pool.capacity,
																							)}
																						</p>
																					) : null}
																					{isInvalid ? (
																						<FieldError
																							errors={
																								quantityField.state.meta.errors
																							}
																						/>
																					) : null}
																				</Field>
																			);
																		}}
																	</form.Field>
																</div>
															);
														},
													)}
												</div>
											</section>
										))}
									</div>
								)}
							</form.Field>
						);
					}}
				</form.Subscribe>
			</form>

			<form.Subscribe
				selector={(state) =>
					[state.canSubmit, state.isSubmitting, state.values] as const
				}
			>
				{([canSubmit, isSubmitting, values]) => {
					const hasSharedPoolConflict = [
						...createSharedAccessoryPoolStates(
							values,
							sharedCapacityByEquipmentType,
						).values(),
					].some((pool) => pool.isOverCapacity);
					return (
						<div className="flex flex-col-reverse gap-2 border-neutral-200 border-t bg-white px-6 py-4 sm:flex-row sm:justify-end">
							<Button
								type="button"
								variant="outline"
								onClick={onCancel}
								disabled={isPending}
							>
								Cancelar
							</Button>
							<Button
								type="submit"
								form={formId}
								disabled={
									!canSubmit ||
									isSubmitting ||
									isPending ||
									hasSharedPoolConflict
								}
							>
								{isSubmitting || isPending
									? "Asignando..."
									: "Guardar accesorios"}
							</Button>
						</div>
					);
				}}
			</form.Subscribe>
		</>
	);
}
