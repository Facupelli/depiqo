import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@repo/ui/components/dialog";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import { Switch } from "@repo/ui/components/switch";
import { useForm } from "@tanstack/react-form";
import { Pencil } from "lucide-react";
import { useId, useState } from "react";
import { getProblemDetailsCode, ProblemDetailsError } from "@/shared/errors";
import { useUpdateBranchAvailability } from "./edit-branch-availability.mutation";
import {
	editBranchAvailabilityFormDefaultValues,
	editBranchAvailabilityFormSchema,
	toUpdateRentalOfferVisibilityAndRentabilityDto,
} from "./edit-branch-availability.schema";

export type EditBranchAvailabilityDialogProps = {
	rentalOfferId: string;
	branchName: string | null;
	showInStore: boolean;
	isRentable: boolean;
};

export function EditBranchAvailabilityDialog({
	rentalOfferId,
	branchName,
	showInStore,
	isRentable,
}: EditBranchAvailabilityDialogProps) {
	const formId = useId();
	const [open, setOpen] = useState(false);
	const mutation = useUpdateBranchAvailability();
	const [error, setError] = useState<string | null>(null);

	return (
		<Dialog
			open={open}
			onOpenChange={(nextOpen) => {
				setOpen(nextOpen);
				if (!nextOpen) setError(null);
			}}
		>
			<DialogTrigger
				render={
					<Button type="button" variant="outline">
						<Pencil className="mr-2 size-4" />
						Configurar sucursal
					</Button>
				}
			/>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Configurar sucursal</DialogTitle>
					<DialogDescription>
						Configura por separado si se muestra en la tienda y si se permiten
						nuevos alquileres en {branchName ?? "esta sucursal"}. Tener un
						precio asignado no activa ninguna de estas opciones.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<EditBranchAvailabilityForm
						key={rentalOfferId}
						formId={formId}
						offer={{ showInStore, isRentable }}
						error={error}
						isPending={mutation.isPending}
						onCancel={() => setOpen(false)}
						onSubmit={async (values, original) => {
							setError(null);
							try {
								await mutation.mutateAsync({
									rentalOfferId,
									body: toUpdateRentalOfferVisibilityAndRentabilityDto(
										values,
										original,
									),
								});
								setOpen(false);
							} catch (cause) {
								setError(
									cause instanceof ProblemDetailsError &&
										getProblemDetailsCode(cause) ===
											"catalog.rental_offer_not_found"
										? "No encontramos esta sucursal del producto. Actualiza la página e inténtalo de nuevo."
										: "No pudimos guardar la configuración. Inténtalo de nuevo.",
								);
							}
						}}
					/>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

function EditBranchAvailabilityForm({
	formId,
	offer,
	error,
	isPending,
	onCancel,
	onSubmit,
}: {
	formId: string;
	offer: { showInStore: boolean; isRentable: boolean };
	error: string | null;
	isPending: boolean;
	onCancel: () => void;
	onSubmit: (
		values: ReturnType<typeof editBranchAvailabilityFormDefaultValues>,
		original: ReturnType<typeof editBranchAvailabilityFormDefaultValues>,
	) => Promise<void>;
}) {
	const [initialValues] = useState(() =>
		editBranchAvailabilityFormDefaultValues(offer),
	);
	const form = useForm({
		defaultValues: initialValues,
		validators: { onSubmit: editBranchAvailabilityFormSchema },
		onSubmit: async ({ value }) => onSubmit(value, initialValues),
	});

	return (
		<form
			id={formId}
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				void form.handleSubmit();
			}}
			className="space-y-6"
		>
			<FieldGroup>
				<form.Field name="showInStore">
					{(field) => (
						<Field orientation="horizontal">
							<Switch
								id={field.name}
								checked={field.state.value}
								onCheckedChange={(checked) =>
									field.handleChange(checked === true)
								}
							/>
							<div>
								<FieldLabel htmlFor={field.name}>
									Mostrar en la tienda
								</FieldLabel>
								<FieldDescription>
									Permite que los clientes la encuentren. Sin un precio válido o
									con el alquiler deshabilitado, no podrán reservarla.
								</FieldDescription>
							</div>
						</Field>
					)}
				</form.Field>
				<form.Field name="isRentable">
					{(field) => (
						<Field orientation="horizontal">
							<Switch
								id={field.name}
								checked={field.state.value}
								onCheckedChange={(checked) =>
									field.handleChange(checked === true)
								}
							/>
							<div>
								<FieldLabel htmlFor={field.name}>
									Permitir nuevos alquileres
								</FieldLabel>
								<FieldDescription>
									Permite nuevas selecciones, incluso si está oculta en la
									tienda. Aún se requiere un precio válido y equipos
									disponibles.
								</FieldDescription>
							</div>
						</Field>
					)}
				</form.Field>
			</FieldGroup>
			{error ? (
				<p role="alert" className="text-destructive text-sm">
					{error}
				</p>
			) : null}
			<div className="flex justify-end gap-3 border-t pt-4">
				<Button
					type="button"
					variant="outline"
					onClick={onCancel}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [
						state.canSubmit,
						state.isDirty,
						state.isSubmitting,
					]}
				>
					{([canSubmit, isDirty, isSubmitting]) => (
						<Button
							type="submit"
							disabled={!canSubmit || !isDirty || isPending || isSubmitting}
						>
							{isPending || isSubmitting ? "Guardando..." : "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</form>
	);
}
