import type { GetBranchesBranchDto } from "@repo/api-contracts";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldError,
	FieldLabel,
	FieldLegend,
	FieldSet,
	FieldTitle,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { ToggleGroup, ToggleGroupItem } from "@repo/ui/components/toggle-group";
import { useStore } from "@tanstack/react-form";
import { Truck, Warehouse } from "lucide-react";
import { useId } from "react";
import type { RentalCustomerDisplayFacts } from "@/modules/rentals/customer-selection/rental-customer-selector";
import { RentalPeriodPicker } from "@/modules/rentals/shared/rental-period/rental-period-picker";
import { withForm } from "@/shared/contexts/form.context";
import type { DraftRentalBranchDisplayFacts } from "../draft-rental-composer";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import { resetPendingDeliveryReview } from "../draft-rental-composer.form-utils";
import {
	canPreserveStaffAgreement,
	createDraftRentalComposerDefaultValues,
} from "../draft-rental-composer.schema";
import { DeliveryAddressAutocomplete } from "./delivery-address-autocomplete";
import { RentalCustomerCombobox } from "./rental-customer-combobox";
import { StaffArrangedDeliveryFields } from "./staff-arranged-delivery-fields";

export const DraftRentalSetupSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: {
		activeBranches: [] as GetBranchesBranchDto[],
		missingBranchMessage: "",
		initialBranch: undefined as DraftRentalBranchDisplayFacts | undefined,
		initialCustomer: undefined as RentalCustomerDisplayFacts | undefined,
	},
	render: function Render({
		form,
		activeBranches,
		missingBranchMessage,
		initialBranch,
		initialCustomer,
	}) {
		const periodId = useId();
		const submissionAttempts = useStore(
			form.store,
			(state) => state.submissionAttempts,
		);
		const {
			state: { selectedBranchName, branchMissing },
		} = useDraftRentalComposer();
		const fulfillmentMethod = useStore(
			form.store,
			(state) => state.values.fulfillmentMethod,
		);
		const branchSelectItems = [
			...(branchMissing && initialBranch
				? [
						{
							label: `${initialBranch.name} (no disponible)`,
							value: initialBranch.id,
						},
					]
				: []),
			...activeBranches.map((branch) => ({
				label: branch.name,
				value: branch.id,
			})),
		];

		function handleBranchChange(nextBranchId: string) {
			const nextBranch = activeBranches.find(
				(branch) => branch.id === nextBranchId,
			);
			if (!nextBranch || nextBranchId === form.state.values.branchId) return;
			resetPendingDeliveryReview(form);

			form.setFieldValue("branchId", nextBranchId);
			form.setFieldValue("selectedOffers", []);
			form.setFieldValue("targetTotal", "");
			form.setFieldValue("adjustmentReason", "");
		}

		return (
			<Card size="sm" className="gap-3 shadow-none">
				<CardHeader>
					<CardTitle className="text-base">Datos del pedido</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3 [&_[data-slot=field]]:gap-1.5">
					<div className="grid gap-3 md:grid-cols-2">
						{activeBranches.length > 1 || branchMissing ? (
							<form.Field name="branchId">
								{(field) => {
									const isInvalid =
										branchMissing ||
										((field.state.meta.isTouched || submissionAttempts > 0) &&
											!field.state.meta.isValid);

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Sucursal</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={(value) => {
													if (value) handleBranchChange(value);
												}}
												items={branchSelectItems}
											>
												<SelectTrigger id={field.name} aria-invalid={isInvalid}>
													<SelectValue placeholder="Selecciona una sucursal" />
												</SelectTrigger>
												<SelectContent>
													{branchMissing && initialBranch ? (
														<SelectItem value={initialBranch.id} disabled>
															{initialBranch.name} (no disponible)
														</SelectItem>
													) : null}
													{activeBranches.map((branch) => (
														<SelectItem key={branch.id} value={branch.id}>
															{branch.name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
											{isInvalid ? (
												<FieldError
													errors={
														branchMissing
															? [{ message: missingBranchMessage }]
															: field.state.meta.errors
													}
												/>
											) : null}
										</Field>
									);
								}}
							</form.Field>
						) : (
							<Field>
								<FieldTitle>Sucursal</FieldTitle>
								<div className="flex h-9 items-center rounded-md border bg-muted/40 px-3 text-sm">
									{branchMissing
										? "Seleccioná una sucursal primero"
										: selectedBranchName}
								</div>
							</Field>
						)}

						<RentalCustomerCombobox
							form={form}
							initialCustomer={initialCustomer}
						/>
					</div>

					<div className="space-y-3">
						<form.Field name="periodStartDate">
							{(startDateField) => (
								<form.Field name="periodStartTime">
									{(startTimeField) => (
										<form.Field name="periodEndDate">
											{(endDateField) => (
												<form.Field name="periodEndTime">
													{(endTimeField) => {
														const periodFields = [
															startDateField,
															startTimeField,
															endDateField,
															endTimeField,
														];
														const visibleErrors = periodFields.map((field) =>
															field.state.meta.isTouched ||
															submissionAttempts > 0
																? field.state.meta.errors
																: [],
														);
														const periodErrors = visibleErrors.flat();
														const periodInvalid = periodErrors.length > 0;

														return (
															<Field
																className="gap-1.5 md:max-w-[calc(50%-0.375rem)]"
																data-invalid={periodInvalid}
															>
																<FieldLabel htmlFor={periodId}>
																	Periodo de alquiler
																</FieldLabel>
																<RentalPeriodPicker
																	id={periodId}
																	value={{
																		startDate: startDateField.state.value,
																		startTime: startTimeField.state.value,
																		endDate: endDateField.state.value,
																		endTime: endTimeField.state.value,
																	}}
																	invalid={{
																		startDate: visibleErrors[0].length > 0,
																		startTime: visibleErrors[1].length > 0,
																		endDate: visibleErrors[2].length > 0,
																		endTime: visibleErrors[3].length > 0,
																	}}
																	onStartDateChange={(value) => {
																		if (value !== startDateField.state.value)
																			resetPendingDeliveryReview(form);
																		startDateField.handleChange(value);
																	}}
																	onStartDateBlur={startDateField.handleBlur}
																	onStartTimeChange={(value) => {
																		if (value !== startTimeField.state.value)
																			resetPendingDeliveryReview(form);
																		startTimeField.handleChange(value);
																	}}
																	onStartTimeBlur={startTimeField.handleBlur}
																	onEndDateChange={(value) => {
																		if (value !== endDateField.state.value)
																			resetPendingDeliveryReview(form);
																		endDateField.handleChange(value);
																	}}
																	onEndDateBlur={endDateField.handleBlur}
																	onEndTimeChange={(value) => {
																		if (value !== endTimeField.state.value)
																			resetPendingDeliveryReview(form);
																		endTimeField.handleChange(value);
																	}}
																	onEndTimeBlur={endTimeField.handleBlur}
																/>
																<FieldError errors={periodErrors} />
															</Field>
														);
													}}
												</form.Field>
											)}
										</form.Field>
									)}
								</form.Field>
							)}
						</form.Field>

						<div className="grid items-end gap-3 sm:grid-cols-[minmax(0,28rem)_auto]">
							<form.Field name="fulfillmentMethod">
								{(field) => (
									<FieldSet className="w-full gap-0 [&_[data-slot=field-legend]]:mb-1.5">
										<FieldLegend variant="label">Entrega</FieldLegend>
										<ToggleGroup
											variant="outline"
											value={[field.state.value]}
											onValueChange={(value) => {
												const nextValue = value[0];
												if (
													nextValue === "PICKUP" ||
													nextValue === "DELIVERY"
												) {
													if (nextValue !== field.state.value)
														resetPendingDeliveryReview(form);
													field.handleChange(nextValue);
												}
											}}
											className="grid w-full grid-cols-2"
										>
											<ToggleGroupItem
												value="PICKUP"
												className="min-w-0 gap-2 data-[state=on]:bg-primary/5 data-[state=on]:text-primary"
											>
												<Warehouse className="size-4" />
												Retiro
											</ToggleGroupItem>
											<ToggleGroupItem
												value="DELIVERY"
												className="min-w-0 gap-2 data-[state=on]:bg-primary/5 data-[state=on]:text-primary"
											>
												<Truck className="size-4" />
												Envío
											</ToggleGroupItem>
										</ToggleGroup>
									</FieldSet>
								)}
							</form.Field>

							<form.Field name="insuranceSelected">
								{(field) => (
									<Field className="justify-end gap-1.5">
										<label
											htmlFor={field.name}
											className="flex h-9 w-fit items-center gap-2 text-sm font-medium"
										>
											<Checkbox
												id={field.name}
												checked={field.state.value}
												onCheckedChange={(checked) =>
													field.handleChange(checked === true)
												}
											/>
											Seguro
										</label>
									</Field>
								)}
							</form.Field>
						</div>
					</div>

					{fulfillmentMethod === "DELIVERY" ? (
						<DeliveryFields form={form} />
					) : null}
				</CardContent>
			</Card>
		);
	},
});

const DeliveryFields = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		const {
			state: { canManageDelivery },
		} = useDraftRentalComposer();
		const arrangement = useStore(
			form.store,
			(state) => state.values.deliveryArrangement,
		);
		const staffArranged = arrangement === "STAFF_ARRANGED";
		const attempts = useStore(form.store, (state) => state.submissionAttempts);
		return (
			<div className="space-y-3 rounded-lg border bg-muted/20 p-3">
				<form.Field name="deliveryArrangement">
					{(field) => (
						<FieldSet className="gap-1.5">
							<FieldLegend variant="label">Modalidad de envío</FieldLegend>
							<ToggleGroup
								variant="outline"
								value={[field.state.value]}
								className="grid w-full grid-cols-1 sm:grid-cols-2"
								onValueChange={(value) => {
									const next = value[0];
									if (
										!canManageDelivery ||
										(next !== "ROUTED" && next !== "STAFF_ARRANGED") ||
										next === field.state.value
									)
										return;
									const initial = form.options.defaultValues;
									const restoreStoredDestination =
										initial?.fulfillmentMethod === "DELIVERY" &&
										initial.deliveryArrangement === next &&
										initial.deliveryDestination.status === "EXISTING";
									field.handleChange(next);
									// Returning to persisted terms is not a destination replacement.
									// Never restore an unsaved agreement or exception decision.
									form.setFieldValue(
										"deliveryDestination",
										restoreStoredDestination
											? { ...initial.deliveryDestination }
											: {
													status:
														next === "STAFF_ARRANGED"
															? "NEW_STAFF_DESTINATION"
															: "INVALID",
													address: "",
												},
									);
									form.setFieldValue("deliveryAgreementAmount", "");
									form.setFieldValue("deliveryAgreementReason", "");
									form.setFieldValue(
										"transportReservationMinutes",
										restoreStoredDestination
											? initial.transportReservationMinutes
											: "",
									);
									resetPendingDeliveryReview(form);
								}}
							>
								<ToggleGroupItem value="ROUTED" disabled={!canManageDelivery}>
									Envío automático
								</ToggleGroupItem>
								<ToggleGroupItem
									value="STAFF_ARRANGED"
									disabled={!canManageDelivery}
								>
									Coordinado por el equipo
								</ToggleGroupItem>
							</ToggleGroup>
							<p className="text-xs text-muted-foreground">
								{staffArranged
									? "Dirección libre, precio acordado y reserva de transporte definidos por el equipo. No requiere configurar el servicio de envío."
									: "Seleccioná una dirección para evaluar el transporte. También podés acordar un precio manual."}
							</p>
							{!canManageDelivery ? (
								<p className="text-xs text-muted-foreground">
									Necesitás permiso para gestionar entregas coordinadas por el
									equipo. Podés conservar las condiciones guardadas al editar
									otros datos.
								</p>
							) : null}
						</FieldSet>
					)}
				</form.Field>
				<form.Field name="deliveryDestination.address">
					{(field) => {
						const isInvalid =
							(staffArranged || field.state.meta.isTouched || attempts > 0) &&
							!field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>
									Dirección de entrega
								</FieldLabel>
								{staffArranged ? (
									<Input
										id={field.name}
										name={field.name}
										value={field.state.value}
										disabled={!canManageDelivery}
										aria-invalid={isInvalid}
										onBlur={field.handleBlur}
										onChange={(event) => {
											const initial = form.options.defaultValues;
											const preservable = canPreserveStaffAgreement(initial);
											const address = event.target.value;
											form.setFieldValue("deliveryDestination", {
												status:
													preservable &&
													address.trim() ===
														initial?.deliveryDestination.address
														? "EXISTING"
														: "NEW_STAFF_DESTINATION",
												address,
											});
											// Address corrections do not replace an accepted agreement.
											if (!preservable) resetPendingDeliveryReview(form);
										}}
									/>
								) : (
									<DeliveryAddressAutocomplete
										id={field.name}
										name={field.name}
										value={field.state.value}
										isInvalid={isInvalid}
										onBlur={field.handleBlur}
										onChange={(address) => {
											if (address === field.state.value) return;
											resetPendingDeliveryReview(form);
											form.setFieldValue("deliveryDestination", {
												status: "INVALID",
												address,
											});
										}}
										onSelect={(suggestion) => {
											resetPendingDeliveryReview(form);
											form.setFieldValue("deliveryDestination", {
												status: "NEW_DESTINATION",
												address: suggestion.formattedAddress,
												locationId: suggestion.locationId,
											});
											form.validateField(
												"deliveryDestination.address",
												"change",
											);
										}}
									/>
								)}
								{isInvalid ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						);
					}}
				</form.Field>
				{staffArranged ? (
					<StaffArrangedDeliveryFields
						form={form}
						canManageDelivery={canManageDelivery}
					/>
				) : null}
			</div>
		);
	},
});
