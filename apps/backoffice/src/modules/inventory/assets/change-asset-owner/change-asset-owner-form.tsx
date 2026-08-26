import { Button } from "@repo/ui/components/button";
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@repo/ui/components/field";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useForm } from "@tanstack/react-form";
import { AlertCircle } from "lucide-react";
import {
	type ChangeAssetOwnerFormValues,
	changeAssetOwnerFormSchema,
} from "./change-asset-owner.schema";

export type ChangeAssetOwnerOwnerOption = {
	id: string;
	name: string;
};

const TENANT_OWNER_VALUE = "tenant-owned";
const TENANT_OWNER_LABEL = "Propiedad del tenant";

interface ChangeAssetOwnerFormProps {
	formId: string;
	defaultValues: ChangeAssetOwnerFormValues;
	owners: ChangeAssetOwnerOwnerOption[];
	isLoadingOwners: boolean;
	ownerOptionsError: string | null;
	isPending: boolean;
	errorMessage: string | null;
	onOwnerChange: () => void;
	onSubmit: (values: ChangeAssetOwnerFormValues) => Promise<void> | void;
	onCancel: () => void;
}

export function ChangeAssetOwnerForm({
	formId,
	defaultValues,
	owners,
	isLoadingOwners,
	ownerOptionsError,
	isPending,
	errorMessage,
	onOwnerChange,
	onSubmit,
	onCancel,
}: ChangeAssetOwnerFormProps) {
	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: changeAssetOwnerFormSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit(value);
		},
	});

	const ownerItems = [
		{ value: TENANT_OWNER_VALUE, label: TENANT_OWNER_LABEL },
		...owners.map((owner) => ({
			value: owner.id,
			label: owner.name,
		})),
	];

	return (
		<>
			<form
				id={formId}
				onSubmit={(event) => {
					event.preventDefault();
					event.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-6"
			>
				<FieldGroup>
					<form.Field name="ownerId">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Propietario</FieldLabel>
									<Select
										items={ownerItems}
										value={field.state.value || TENANT_OWNER_VALUE}
										disabled={isLoadingOwners}
										onValueChange={(value) => {
											field.handleChange(
												value === TENANT_OWNER_VALUE || value == null
													? ""
													: value,
											);
											onOwnerChange();
										}}
									>
										<SelectTrigger aria-invalid={isInvalid} className="w-full">
											<SelectValue placeholder="Selecciona propietario" />
										</SelectTrigger>
										<SelectContent>
											{ownerItems.map((item) => (
												<SelectItem key={item.value} value={item.value}>
													{item.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isLoadingOwners ? (
										<p className="text-muted-foreground text-xs">
											Cargando propietarios...
										</p>
									) : null}
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>

				<p className="text-muted-foreground text-sm">
					Los alquileres que ya tienen esta unidad asignada conservarán el
					propietario registrado en el momento de la asignación. El cambio se
					aplicará a futuras asignaciones.
				</p>

				{ownerOptionsError ? (
					<div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<p>{ownerOptionsError}</p>
					</div>
				) : null}

				{errorMessage ? (
					<div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
						<AlertCircle className="mt-0.5 size-4 shrink-0" />
						<p>{errorMessage}</p>
					</div>
				) : null}
			</form>

			<div className="flex justify-end gap-3 border-t pt-4">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
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
						>
							{isSubmitting || isPending ? "Guardando..." : "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}
