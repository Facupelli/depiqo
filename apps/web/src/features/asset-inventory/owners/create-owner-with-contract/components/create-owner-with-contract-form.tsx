import { useForm } from "@tanstack/react-form";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	type CreateOwnerWithContractFormValues,
	createOwnerWithContractFormDefaultValues,
	createOwnerWithContractFormSchema,
} from "./create-owner-with-contract-form.schema";

const BASIS_LABELS: Record<CreateOwnerWithContractFormValues["basis"], string> =
	{
		GROSS: "Ingresos brutos",
		NET: "Neto recaudado",
	};

interface CreateOwnerWithContractFormProps {
	formId: string;
	defaultValues?: CreateOwnerWithContractFormValues;
	isPending: boolean;
	submitLabel?: string;
	pendingLabel?: string;
	cancelLabel?: string;
	onSubmit: (values: CreateOwnerWithContractFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function CreateOwnerWithContractForm({
	formId,
	defaultValues = createOwnerWithContractFormDefaultValues(),
	isPending,
	submitLabel = "Crear propietario",
	pendingLabel = "Creando...",
	cancelLabel = "Cancelar",
	onSubmit,
	onCancel,
}: CreateOwnerWithContractFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: createOwnerWithContractFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const basisItems = Object.entries(BASIS_LABELS).map(([value, label]) => ({
		value,
		label,
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
			>
				<FieldGroup className="gap-5">
					<form.Field name="ownerName">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel
										htmlFor={field.name}
										className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
									>
										Propietario
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={isInvalid}
										placeholder="Ej. Juan Pérez"
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="ownerSharePercent">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											htmlFor={field.name}
											className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
										>
											Participación Propietario
										</FieldLabel>
										<div className="relative">
											<Input
												id={field.name}
												name={field.name}
												type="number"
												step="0.01"
												min="0"
												max="100"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.valueAsNumber || 0)
												}
												aria-invalid={isInvalid}
												placeholder="70"
												className="pr-8"
											/>
											<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
												%
											</span>
										</div>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="rentalSharePercent">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											htmlFor={field.name}
											className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
										>
											Participación Alquiler
										</FieldLabel>
										<div className="relative">
											<Input
												id={field.name}
												name={field.name}
												type="number"
												step="0.01"
												min="0"
												max="100"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.valueAsNumber || 0)
												}
												aria-invalid={isInvalid}
												placeholder="30"
												className="pr-8"
											/>
											<span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-400">
												%
											</span>
										</div>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
					</div>

					<p className="-mt-2 flex items-center gap-1.5 text-xs text-neutral-400">
						<Info className="h-3 w-3 shrink-0" />
						La suma de ambas participaciones debe ser igual al 100%.
					</p>

					<form.Field name="basis">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel
										htmlFor={field.name}
										className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
									>
										Base del Contrato
									</FieldLabel>
									<Select
										name={field.name}
										value={field.state.value}
										onValueChange={(value) =>
											field.handleChange(
												value as CreateOwnerWithContractFormValues["basis"],
											)
										}
										items={basisItems}
									>
										<SelectTrigger id={field.name} aria-invalid={isInvalid}>
											<SelectValue />
										</SelectTrigger>
										<SelectContent>
											{basisItems.map((basis) => (
												<SelectItem key={basis.value} value={basis.value}>
													{basis.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<div className="grid grid-cols-2 gap-4">
						<form.Field name="validFrom">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											htmlFor={field.name}
											className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
										>
											Válido Desde
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="date"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={isInvalid}
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="validTo">
							{(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;

								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											htmlFor={field.name}
											className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
										>
											Válido Hasta (Opcional)
										</FieldLabel>
										<Input
											id={field.name}
											name={field.name}
											type="date"
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(event) =>
												field.handleChange(event.target.value)
											}
											aria-invalid={isInvalid}
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>
					</div>
				</FieldGroup>
			</form>

			<div className="flex justify-end gap-2 pt-4">
				<Button
					type="button"
					variant="ghost"
					onClick={onCancel}
					disabled={isPending}
				>
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
							disabled={!canSubmit || !isDirty || isSubmitting || isPending}
							className="bg-neutral-900 text-white hover:bg-neutral-700"
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
