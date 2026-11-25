import type { BranchRentalAssetBufferDto } from "@repo/api-contracts";
import { Alert, AlertDescription } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@repo/ui/components/card";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { getProblemDetailsCode } from "@/shared/errors";
import {
	usePutRentalAssetBuffer,
	useRentalAssetBuffer,
} from "./rental-asset-buffer.queries";
import { rentalAssetBufferFormSchema } from "./rental-asset-buffer.schema";

const fields = [
	{
		name: "beforeBufferMinutes",
		label: "Margen antes del alquiler (minutos)",
	},
	{
		name: "afterBufferMinutes",
		label: "Margen después de la devolución (minutos)",
	},
] as const;

export function RentalAssetBufferSection({ branchId }: { branchId: string }) {
	const buffer = useRentalAssetBuffer(branchId);

	if (buffer.isPending) return <Skeleton className="h-56 w-full" />;

	return (
		<div className="space-y-4">
			{buffer.isError && (
				<Alert variant="destructive">
					<AlertDescription className="flex flex-wrap items-center justify-between gap-3">
						<span>No pudimos cargar el margen entre alquileres.</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={() => buffer.refetch()}
						>
							Reintentar
						</Button>
					</AlertDescription>
				</Alert>
			)}
			{buffer.data && (
				<RentalAssetBufferForm
					key={branchId}
					branchId={branchId}
					buffer={buffer.data}
				/>
			)}
		</div>
	);
}

function RentalAssetBufferForm({
	branchId,
	buffer,
}: {
	branchId: string;
	buffer: BranchRentalAssetBufferDto;
}) {
	const save = usePutRentalAssetBuffer(branchId);
	const form = useForm({
		defaultValues: {
			beforeBufferMinutes: String(buffer.beforeBufferMinutes),
			afterBufferMinutes: String(buffer.afterBufferMinutes),
		},
		validators: {
			onChange: rentalAssetBufferFormSchema,
			onSubmit: rentalAssetBufferFormSchema,
		},
		onSubmit: async ({ value }) => {
			const body = rentalAssetBufferFormSchema.parse(value);
			try {
				await save.mutateAsync(body);
			} catch (error) {
				toast.error(
					getProblemDetailsCode(error) === "tenant_management.branch_not_found"
						? "No encontramos la sucursal. Actualizá la página."
						: "No pudimos guardar el margen entre alquileres. Intentá nuevamente.",
				);
				return;
			}
			form.reset({
				beforeBufferMinutes: String(body.beforeBufferMinutes),
				afterBufferMinutes: String(body.afterBufferMinutes),
			});
			toast.success("Margen entre alquileres guardado");
		},
	});

	return (
		<Card>
			<CardHeader>
				<CardTitle>Margen entre alquileres</CardTitle>
				<CardDescription>
					Reservá tiempo antes y después de cada alquiler en esta sucursal, sin
					cambiar las fechas ni el precio para el cliente. Ingresá 0 en ambos
					campos para no reservar tiempo adicional.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(event) => {
						event.preventDefault();
						void form.handleSubmit();
					}}
					className="space-y-5"
				>
					<fieldset
						disabled={save.isPending}
						className="grid gap-4 sm:grid-cols-2"
					>
						{fields.map(({ name, label }) => (
							<form.Field key={name} name={name}>
								{(field) => {
									const invalid = !field.state.meta.isValid;
									const id = `rental-asset-buffer-${name}`;
									return (
										<Field data-invalid={invalid}>
											<FieldLabel htmlFor={id}>{label}</FieldLabel>
											<Input
												id={id}
												inputMode="numeric"
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(event) =>
													field.handleChange(event.target.value)
												}
												aria-invalid={invalid}
												aria-describedby={invalid ? `${id}-error` : undefined}
											/>
											<FieldError
												id={`${id}-error`}
												errors={field.state.meta.errors}
											/>
										</Field>
									);
								}}
							</form.Field>
						))}
					</fieldset>
					<form.Subscribe
						selector={(state) =>
							state.canSubmit && !state.isDefaultValue && !state.isSubmitting
						}
					>
						{(canSave) => (
							<Button type="submit" disabled={!canSave || save.isPending}>
								{save.isPending ? "Guardando..." : "Guardar margen"}
							</Button>
						)}
					</form.Subscribe>
				</form>
			</CardContent>
		</Card>
	);
}
