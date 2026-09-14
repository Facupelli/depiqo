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
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";
import { DeliveryAddressAutocomplete } from "./delivery-address-autocomplete";
import { RentalCustomerCombobox } from "./rental-customer-combobox";

export const DraftRentalSetupSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: {
		activeBranches: [] as GetBranchesBranchDto[],
		initialBranch: undefined as DraftRentalBranchDisplayFacts | undefined,
		initialCustomer: undefined as RentalCustomerDisplayFacts | undefined,
	},
	render: function Render({
		form,
		activeBranches,
		initialBranch,
		initialCustomer,
	}) {
		const periodId = useId();
		const { selectedBranchName, branchMissing } = useDraftRentalComposer();
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
			if (!nextBranch) return;

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
										field.state.meta.isTouched && !field.state.meta.isValid;

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
												<FieldError errors={field.state.meta.errors} />
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
														const periodInvalid = [
															startDateField,
															startTimeField,
															endDateField,
															endTimeField,
														].some((field) => !field.state.meta.isValid);
														const periodErrors = [
															...startDateField.state.meta.errors,
															...startTimeField.state.meta.errors,
															...endDateField.state.meta.errors,
															...endTimeField.state.meta.errors,
														];

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
																		startDate:
																			!startDateField.state.meta.isValid,
																		startTime:
																			!startTimeField.state.meta.isValid,
																		endDate: !endDateField.state.meta.isValid,
																		endTime: !endTimeField.state.meta.isValid,
																	}}
																	onStartDateChange={
																		startDateField.handleChange
																	}
																	onStartDateBlur={startDateField.handleBlur}
																	onStartTimeChange={
																		startTimeField.handleChange
																	}
																	onStartTimeBlur={startTimeField.handleBlur}
																	onEndDateChange={endDateField.handleChange}
																	onEndDateBlur={endDateField.handleBlur}
																	onEndTimeChange={endTimeField.handleChange}
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
		return (
			<div className="rounded-lg border bg-muted/20 p-3">
				<form.Field name="deliveryDestination.address">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>
									Dirección de entrega
								</FieldLabel>
								<DeliveryAddressAutocomplete
									id={field.name}
									name={field.name}
									value={field.state.value}
									isInvalid={isInvalid}
									onBlur={field.handleBlur}
									onChange={(address) => {
										form.setFieldValue("deliveryDestination", {
											status: "INVALID",
											address,
										});
									}}
									onSelect={(suggestion) => {
										form.setFieldValue("deliveryDestination", {
											status: "NEW_DESTINATION",
											address: suggestion.formattedAddress,
											locationId: suggestion.locationId,
										});
										form.validateField("deliveryDestination.address", "change");
									}}
								/>
								{isInvalid ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						);
					}}
				</form.Field>
			</div>
		);
	},
});
