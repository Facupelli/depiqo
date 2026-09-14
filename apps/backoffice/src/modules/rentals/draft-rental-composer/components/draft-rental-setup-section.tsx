import type { GetBranchesBranchDto } from "@repo/api-contracts";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useStore } from "@tanstack/react-form";
import { CalendarIcon, Truck, Warehouse } from "lucide-react";
import type { RentalCustomerDisplayFacts } from "@/modules/rentals/customer-selection/rental-customer-selector";
import { withForm } from "@/shared/contexts/form.context";
import type { DraftRentalBranchDisplayFacts } from "../draft-rental-composer";
import { useDraftRentalComposer } from "../draft-rental-composer.context";
import {
	createDraftRentalComposerDefaultValues,
	draftRentalMinuteOfDayToTime,
	draftRentalTimeToMinuteOfDay,
} from "../draft-rental-composer.schema";
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
			<Card className="shadow-xs">
				<CardHeader>
					<CardTitle className="text-base">Datos del pedido</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid gap-3 md:grid-cols-2">
						{activeBranches.length > 1 || branchMissing ? (
							<form.Field name="branchId">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;

									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel>Sucursal</FieldLabel>
											<Select
												value={field.state.value}
												onValueChange={(value) => {
													if (value) handleBranchChange(value);
												}}
												items={branchSelectItems}
											>
												<SelectTrigger aria-invalid={isInvalid}>
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
								<FieldLabel>Sucursal</FieldLabel>
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

					<div className="grid gap-3 md:grid-cols-4">
						<form.Field name="periodStartDate">
							{(field) => (
								<Field data-invalid={!field.state.meta.isValid}>
									<FieldLabel htmlFor={field.name}>Inicio</FieldLabel>
									<div className="relative">
										<CalendarIcon className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
										<Input
											id={field.name}
											type="date"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											className="pl-9"
										/>
									</div>
									{!field.state.meta.isValid && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
						</form.Field>

						<form.Field name="periodStartTime">
							{(field) => (
								<Field data-invalid={!field.state.meta.isValid}>
									<FieldLabel htmlFor={field.name}>Hora inicio</FieldLabel>
									<Input
										id={field.name}
										type="time"
										step={60}
										aria-invalid={!field.state.meta.isValid}
										value={draftRentalMinuteOfDayToTime(field.state.value)}
										onBlur={field.handleBlur}
										onChange={(event) => {
											const value = draftRentalTimeToMinuteOfDay(
												event.target.value,
											);
											if (value !== null) field.handleChange(value);
										}}
									/>
									{!field.state.meta.isValid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							)}
						</form.Field>

						<form.Field name="periodEndDate">
							{(field) => (
								<Field data-invalid={!field.state.meta.isValid}>
									<FieldLabel htmlFor={field.name}>Devolución</FieldLabel>
									<Input
										id={field.name}
										type="date"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
									/>
									{!field.state.meta.isValid && (
										<FieldError errors={field.state.meta.errors} />
									)}
								</Field>
							)}
						</form.Field>

						<form.Field name="periodEndTime">
							{(field) => (
								<Field data-invalid={!field.state.meta.isValid}>
									<FieldLabel htmlFor={field.name}>Hora devolución</FieldLabel>
									<Input
										id={field.name}
										type="time"
										step={60}
										aria-invalid={!field.state.meta.isValid}
										value={draftRentalMinuteOfDayToTime(field.state.value)}
										onBlur={field.handleBlur}
										onChange={(event) => {
											const value = draftRentalTimeToMinuteOfDay(
												event.target.value,
											);
											if (value !== null) field.handleChange(value);
										}}
									/>
									{!field.state.meta.isValid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							)}
						</form.Field>
					</div>

					<div className="grid gap-3 md:grid-cols-2">
						<form.Field name="fulfillmentMethod">
							{(field) => (
								<Field>
									<FieldLabel>Entrega</FieldLabel>
									<div className="grid grid-cols-2 gap-2">
										<button
											type="button"
											onClick={() => field.handleChange("PICKUP")}
											className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${field.state.value === "PICKUP" ? "border-primary bg-primary/5" : "bg-background"}`}
										>
											<Warehouse className="size-4" /> Retiro
										</button>
										<button
											type="button"
											onClick={() => field.handleChange("DELIVERY")}
											className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${field.state.value === "DELIVERY" ? "border-primary bg-primary/5" : "bg-background"}`}
										>
											<Truck className="size-4" /> Envío
										</button>
									</div>
								</Field>
							)}
						</form.Field>

						<form.Field name="insuranceSelected">
							{(field) => (
								<Field className="justify-end">
									<label
										htmlFor={field.name}
										className="flex h-9 items-center gap-2 rounded-md border px-3 text-sm"
									>
										<Checkbox
											id={field.name}
											checked={field.state.value}
											onCheckedChange={(checked) =>
												field.handleChange(checked === true)
											}
										/>
										Seguro seleccionado
									</label>
								</Field>
							)}
						</form.Field>
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
