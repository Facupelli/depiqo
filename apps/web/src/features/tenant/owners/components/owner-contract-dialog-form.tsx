import { ContractBasis } from "@repo/types";
import { useForm } from "@tanstack/react-form";
import { Info, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Field,
	FieldContent,
	FieldDescription,
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useCreateOwnerContract } from "../owners.queries";
import {
	getOwnerContractFormDefaults,
	ownerContractFormSchema,
	toCreateOwnerContractDto,
} from "../schemas/owner-contract-form.schema";

interface NewOwnerContractDialogProps {
	ownerId: string;
}

const BASIS_LABELS: Record<ContractBasis, string> = {
	NET_COLLECTED: "Neto Recaudado",
};

const formId = "new-owner-contract";

export function NewOwnerContractDialog({
	ownerId,
}: NewOwnerContractDialogProps) {
	const [open, setOpen] = useState(false);
	const { mutateAsync, isPending } = useCreateOwnerContract();

	const form = useForm({
		defaultValues: getOwnerContractFormDefaults(),
		validators: { onSubmit: ownerContractFormSchema },
		onSubmit: async ({ value }) => {
			const dto = toCreateOwnerContractDto(value, ownerId);
			try {
				await mutateAsync({ ownerId, dto });
				setOpen(false);
				form.reset();
			} catch (errorr) {
				console.log(errorr);
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger
				render={
					<Button>
						<Plus className="mr-1.5 h-4 w-4" />
						Nuevo Contrato
					</Button>
				}
			/>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Nuevo Contrato</DialogTitle>
					<DialogDescription>
						Configuración de acuerdo comercial
					</DialogDescription>
				</DialogHeader>

				<form
					id={formId}
					onSubmit={(e) => {
						e.preventDefault();
						e.stopPropagation();
						form.handleSubmit();
					}}
				>
					<FieldGroup className="gap-5">
						{/* Owner share + Rental share */}
						<div className="grid grid-cols-2 gap-4">
							<form.Field
								name="ownerShare"
								children={(field) => {
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
													max="1"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) =>
														field.handleChange(parseFloat(e.target.value))
													}
													aria-invalid={isInvalid}
													placeholder="0.70"
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
							/>

							<form.Field
								name="rentalShare"
								children={(field) => {
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
													max="1"
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(e) =>
														field.handleChange(parseFloat(e.target.value))
													}
													aria-invalid={isInvalid}
													placeholder="0.30"
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
							/>
						</div>

						{/* Sum hint */}
						<p className="flex items-center gap-1.5 text-xs text-neutral-400 -mt-2">
							<Info className="h-3 w-3 shrink-0" />
							La suma de ambas participaciones debe ser igual al 100% (1.00).
						</p>

						{/* Basis */}
						<form.Field
							name="basis"
							children={(field) => {
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
											onValueChange={(v) =>
												field.handleChange(v as ContractBasis)
											}
											items={Object.values(ContractBasis).map((basis) => ({
												value: basis,
												label: BASIS_LABELS[basis],
											}))}
										>
											<SelectTrigger id={field.name} aria-invalid={isInvalid}>
												<SelectValue />
											</SelectTrigger>
											<SelectContent>
												{Object.values(ContractBasis).map((basis) => (
													<SelectItem key={basis} value={basis}>
														{BASIS_LABELS[basis]}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>

						{/* Valid from + Valid until */}
						<div className="grid grid-cols-2 gap-4">
							<form.Field
								name="validFrom"
								children={(field) => {
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
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>

							<form.Field
								name="validUntil"
								children={(field) => {
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
												onChange={(e) => field.handleChange(e.target.value)}
												aria-invalid={isInvalid}
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							/>
						</div>

						{/* Notes */}
						<form.Field
							name="notes"
							children={(field) => {
								const isInvalid =
									field.state.meta.isTouched && !field.state.meta.isValid;
								return (
									<Field data-invalid={isInvalid}>
										<FieldLabel
											htmlFor={field.name}
											className="text-xs font-semibold uppercase tracking-wider text-neutral-500"
										>
											Notas
										</FieldLabel>
										<Textarea
											id={field.name}
											name={field.name}
											value={field.state.value}
											onBlur={field.handleBlur}
											onChange={(e) => field.handleChange(e.target.value)}
											aria-invalid={isInvalid}
											placeholder="Términos adicionales o especificaciones del activo..."
											className="min-h-24 resize-none"
										/>
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						/>

						{/* isActive switch */}
						<form.Field
							name="isActive"
							children={(field) => (
								<Field
									orientation="horizontal"
									className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3"
								>
									<FieldContent>
										<FieldLabel
											htmlFor={field.name}
											className="font-semibold text-neutral-800"
										>
											Contrato Activo
										</FieldLabel>
										<FieldDescription>
											Habilita este contrato inmediatamente tras guardar.
										</FieldDescription>
									</FieldContent>
									<Switch
										id={field.name}
										name={field.name}
										checked={field.state.value}
										onCheckedChange={field.handleChange}
									/>
								</Field>
							)}
						/>
					</FieldGroup>
				</form>

				<DialogFooter>
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
						children={([canSubmit, isSubmitting]) => (
							<>
								<Button
									type="button"
									variant="ghost"
									onClick={() => setOpen(false)}
									disabled={isPending}
								>
									Cancelar
								</Button>
								<Button
									type="submit"
									form={formId}
									disabled={!canSubmit || isPending}
									className="bg-neutral-900 text-white hover:bg-neutral-700"
								>
									{isSubmitting || isPending
										? "Guardando..."
										: "Guardar Contrato"}
								</Button>
							</>
						)}
					/>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
