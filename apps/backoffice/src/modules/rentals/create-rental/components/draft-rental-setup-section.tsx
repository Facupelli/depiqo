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
	NativeSelect,
	NativeSelectOption,
} from "@repo/ui/components/native-select";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useStore } from "@tanstack/react-form";
import { CalendarIcon, Truck, Warehouse } from "lucide-react";
import { withForm } from "@/shared/contexts/form.context";
import { useDraftRentalComposer } from "../create-draft-rental-composer.context";
import { createDraftRentalComposerDefaultValues } from "../create-draft-rental-composer.schema";
import { RentalCustomerCombobox } from "./rental-customer-combobox";

const TIME_OPTIONS = Array.from({ length: 24 }, (_, hour) => ({
	value: hour * 60,
	label: `${String(hour).padStart(2, "0")}:00`,
}));

export const DraftRentalSetupSection = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: {
		activeBranches: [] as GetBranchesBranchDto[],
	},
	render: function Render({ form, activeBranches }) {
		const { selectedBranchName, branchMissing } = useDraftRentalComposer();
		const fulfillmentMethod = useStore(
			form.store,
			(state) => state.values.fulfillmentMethod,
		);

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
						{activeBranches.length > 1 ? (
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
												items={activeBranches.map((branch) => ({
													label: branch.name,
													value: branch.id,
												}))}
											>
												<SelectTrigger aria-invalid={isInvalid}>
													<SelectValue placeholder="Selecciona una sucursal" />
												</SelectTrigger>
												<SelectContent>
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

						<RentalCustomerCombobox form={form} />
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
								<Field>
									<FieldLabel htmlFor={field.name}>Hora inicio</FieldLabel>
									<NativeSelect
										id={field.name}
										value={String(field.state.value)}
										onChange={(event) =>
											field.handleChange(Number(event.target.value))
										}
										className="w-full"
									>
										{TIME_OPTIONS.map((option) => (
											<NativeSelectOption
												key={option.value}
												value={option.value}
											>
												{option.label}
											</NativeSelectOption>
										))}
									</NativeSelect>
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
								<Field>
									<FieldLabel htmlFor={field.name}>Hora devolución</FieldLabel>
									<NativeSelect
										id={field.name}
										value={String(field.state.value)}
										onChange={(event) =>
											field.handleChange(Number(event.target.value))
										}
										className="w-full"
									>
										{TIME_OPTIONS.map((option) => (
											<NativeSelectOption
												key={option.value}
												value={option.value}
											>
												{option.label}
											</NativeSelectOption>
										))}
									</NativeSelect>
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
			<div className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-2">
				<form.Field name="deliveryDetails.addressLine1">
					{(field) => (
						<Field data-invalid={!field.state.meta.isValid}>
							<FieldLabel htmlFor={field.name}>Dirección</FieldLabel>
							<Input
								id={field.name}
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
				<form.Field name="deliveryDetails.city">
					{(field) => (
						<Field data-invalid={!field.state.meta.isValid}>
							<FieldLabel htmlFor={field.name}>Ciudad</FieldLabel>
							<Input
								id={field.name}
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
			</div>
		);
	},
});
