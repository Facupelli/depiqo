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
import { useUpdateBranchAvailability } from "./edit-branch-availability.mutation";
import {
	editBranchAvailabilityFormDefaultValues,
	editBranchAvailabilityFormSchema,
	toUpdateRentalOfferVisibilityAndRentabilityDto,
} from "./edit-branch-availability.schema";

export type EditBranchAvailabilityDialogProps = {
	rentalOfferId: string;
	branchName: string | null;
	isVisible: boolean;
	isRentable: boolean;
};

export function EditBranchAvailabilityDialog({
	rentalOfferId,
	branchName,
	isVisible,
	isRentable,
}: EditBranchAvailabilityDialogProps) {
	const formId = useId();
	const [open, setOpen] = useState(false);
	const mutation = useUpdateBranchAvailability();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
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
						Actualiza la visibilidad y disponibilidad de esta oferta para{" "}
						{branchName ?? "esta sucursal"}.
					</DialogDescription>
				</DialogHeader>
				{open ? (
					<EditBranchAvailabilityForm
						key={rentalOfferId}
						formId={formId}
						offer={{ isVisible, isRentable }}
						isPending={mutation.isPending}
						onCancel={() => setOpen(false)}
						onSubmit={async (values) => {
							await mutation.mutateAsync({
								rentalOfferId,
								body: toUpdateRentalOfferVisibilityAndRentabilityDto(values),
							});
							setOpen(false);
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
	isPending,
	onCancel,
	onSubmit,
}: {
	formId: string;
	offer: { isVisible: boolean; isRentable: boolean };
	isPending: boolean;
	onCancel: () => void;
	onSubmit: (
		values: ReturnType<typeof editBranchAvailabilityFormDefaultValues>,
	) => Promise<void>;
}) {
	const form = useForm({
		defaultValues: editBranchAvailabilityFormDefaultValues(offer),
		validators: { onSubmit: editBranchAvailabilityFormSchema },
		onSubmit: async ({ value }) => onSubmit(value),
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
				<form.Field name="isVisible">
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
									Visible en el catálogo
								</FieldLabel>
								<FieldDescription>
									Muestra esta oferta a los clientes en el catálogo.
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
									Disponible para alquilar
								</FieldLabel>
								<FieldDescription>
									Permite que esta oferta se seleccione para nuevos alquileres.
								</FieldDescription>
							</div>
						</Field>
					)}
				</form.Field>
			</FieldGroup>
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
