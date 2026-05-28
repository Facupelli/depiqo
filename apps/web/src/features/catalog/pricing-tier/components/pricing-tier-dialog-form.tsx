import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useLocations } from "@/features/tenant/locations/locations.queries";
import {
	GLOBAL_LOCATION_VALUE,
	type PricingTierFormValues,
	pricingTierFormDefaults,
	pricingTierFormSchema,
} from "../schemas/pricing-tier-form.schema";

interface AddPricingTierDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	billingUnitLabel: string;
	onAdd: (tier: PricingTierFormValues) => void;
}

export function AddPricingTierDialogForm({
	open,
	onOpenChange,
	billingUnitLabel,
	onAdd,
}: AddPricingTierDialogProps) {
	const { data: locations } = useLocations();

	const locationItems = [
		{ value: GLOBAL_LOCATION_VALUE, label: "Global (Default)" },
		...(locations?.map((l) => ({ value: l.id, label: l.name })) ?? []),
	];

	const form = useForm({
		defaultValues: pricingTierFormDefaults,
		validators: { onSubmit: pricingTierFormSchema },
		onSubmit: ({ value }) => {
			onAdd(value);
			onOpenChange(false);
			form.reset();
		},
	});

	function handleOpenChange(next: boolean) {
		if (!next) {
			form.reset();
		}
		onOpenChange(next);
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Add Pricing Tier</DialogTitle>
				</DialogHeader>

				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-5 pt-2"
				>
					{/* Location scope */}
					<form.Field name="locationId">
						{(field) => (
							<div className="space-y-1.5">
								<Label
									htmlFor={field.name}
									className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
								>
									Location Scope
								</Label>
								<Select
									value={field.state.value}
									onValueChange={(value) => {
										if (value !== null) field.handleChange(value);
									}}
									items={locationItems}
								>
									<SelectTrigger id={field.name}>
										<SelectValue placeholder="Select a location" />
									</SelectTrigger>
									<SelectContent>
										{locationItems.map((item) => (
											<SelectItem key={item.value} value={item.value}>
												{item.label}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{field.state.meta.errors[0] && (
									<p className="text-destructive text-xs">
										{field.state.meta.errors[0].message}
									</p>
								)}
							</div>
						)}
					</form.Field>

					{/* From / To */}
					<div className="grid grid-cols-2 gap-3">
						<form.Field name="fromUnit">
							{(field) => (
								<div className="space-y-1.5">
									<Label
										htmlFor={field.name}
										className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
									>
										From ({billingUnitLabel})
									</Label>
									<Input
										id={field.name}
										type="number"
										min={1}
										placeholder="1"
										value={field.state.value ?? ""}
										onChange={(e) =>
											field.handleChange(
												e.target.value === ""
													? (null as unknown as number)
													: Number(e.target.value),
											)
										}
										onBlur={field.handleBlur}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									{field.state.meta.errors[0] && (
										<p className="text-destructive text-xs">
											{field.state.meta.errors[0].message}
										</p>
									)}
								</div>
							)}
						</form.Field>

						<form.Field name="toUnit">
							{(field) => (
								<div className="space-y-1.5">
									<Label
										htmlFor={field.name}
										className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
									>
										To ({billingUnitLabel}, optional)
									</Label>
									<Input
										id={field.name}
										type="number"
										min={1}
										placeholder="Unlimited"
										value={field.state.value ?? ""}
										onChange={(e) =>
											field.handleChange(
												e.target.value === "" ? null : Number(e.target.value),
											)
										}
										onBlur={field.handleBlur}
										aria-invalid={field.state.meta.errors.length > 0}
									/>
									{field.state.meta.errors[0] && (
										<p className="text-destructive text-xs">
											{field.state.meta.errors[0].message}
										</p>
									)}
								</div>
							)}
						</form.Field>
					</div>

					{/* Price per unit */}
					<form.Field name="pricePerUnit">
						{(field) => (
							<div className="space-y-1.5">
								<Label
									htmlFor={field.name}
									className="text-muted-foreground text-xs font-semibold uppercase tracking-wider"
								>
									Price per {billingUnitLabel}
								</Label>
								<Input
									id={field.name}
									type="number"
									min={0}
									step={0.01}
									placeholder="0.00"
									value={field.state.value ?? ""}
									onChange={(e) =>
										field.handleChange(
											e.target.value === "" ? 0 : Number(e.target.value),
										)
									}
									onBlur={field.handleBlur}
									aria-invalid={field.state.meta.errors.length > 0}
								/>
								{field.state.meta.errors[0] && (
									<p className="text-destructive text-xs">
										{field.state.meta.errors[0].message}
									</p>
								)}
							</div>
						)}
					</form.Field>

					{/* Billing unit hint */}
					<p className="text-muted-foreground text-xs">
						This product uses{" "}
						<span className="text-foreground font-medium">
							{billingUnitLabel} billing
						</span>
						. From/To values represent billing units.
					</p>

					{/* Footer */}
					<div className="flex justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="outline"
							onClick={() => handleOpenChange(false)}
						>
							Cancel
						</Button>
						<Button type="submit">Add Tier</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
