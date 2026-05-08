import type { LocationListResponse, OwnerListResponse } from "@repo/schemas";
import { TrackingMode } from "@repo/types";
import { useForm } from "@tanstack/react-form";
import { useState } from "react";
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
import { ProblemDetailsError } from "@/shared/errors";
import {
	type AssetFormValues,
	assetFormSchema,
} from "../schemas/asset-form.schema";

interface AssetFormProps {
	defaultValues: AssetFormValues;
	onSubmit: (payload: {
		values: AssetFormValues;
		dirtyValues: Partial<AssetFormValues>;
	}) => Promise<void> | void;
	onCancel: () => void;
	isPending: boolean;
	submitLabel: string;
	pendingLabel: string;
	formId: string;
	locations: LocationListResponse;
	owners: OwnerListResponse;
	isLocationsLoading: boolean;
	isOwnersLoading: boolean;
	trackingMode: TrackingMode;
}

const NO_OWNER_VALUE = "__none__";

export function AssetForm({
	defaultValues,
	onSubmit,
	onCancel,
	isPending,
	submitLabel,
	pendingLabel,
	formId,
	locations,
	owners,
	isLocationsLoading,
	isOwnersLoading,
	trackingMode,
}: AssetFormProps) {
	const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
		null,
	);
	const [serialNumberSubmitError, setSerialNumberSubmitError] = useState<
		string | null
	>(null);

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: assetFormSchema(trackingMode),
		},
		onSubmit: async ({ value }) => {
			try {
				setSubmitErrorMessage(null);
				setSerialNumberSubmitError(null);

				await onSubmit({
					values: value,
					dirtyValues: getDirtyValues(value, defaultValues),
				});
			} catch (error) {
				const submitError = getSubmitError?.(error);

				if (submitError) {
					if (submitError.field) {
						setSerialNumberSubmitError(submitError.message);
					} else {
						setSubmitErrorMessage(submitError.message);
					}
					return;
				}

				throw error;
			}
		},
	});

	return (
		<>
			<form
				id={formId}
				onSubmit={(e) => {
					e.preventDefault();
					e.stopPropagation();
					form.handleSubmit();
				}}
				className="space-y-4"
			>
				<FieldGroup>
					<form.Field name="locationId">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Ubicacion</FieldLabel>
									<Select
										value={field.state.value}
										onValueChange={(value) =>
											value && field.handleChange(value)
										}
										disabled={isLocationsLoading}
										items={locations.map((location) => ({
											value: location.id,
											label: location.name,
										}))}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={
													isLocationsLoading
														? "Cargando ubicaciones..."
														: "Selecciona una ubicacion"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											{locations.map((location) => (
												<SelectItem key={location.id} value={location.id}>
													{location.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="ownerId">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>Propietario </FieldLabel>
									<Select
										value={field.state.value || NO_OWNER_VALUE}
										onValueChange={(value) => {
											const nextValue = value ?? NO_OWNER_VALUE;
											field.handleChange(
												nextValue === NO_OWNER_VALUE ? "" : nextValue,
											);
										}}
										disabled={isOwnersLoading}
										items={owners.map((owner) => ({
											value: owner.id,
											label: owner.name,
										}))}
									>
										<SelectTrigger>
											<SelectValue
												placeholder={
													isOwnersLoading
														? "Cargando propietarios..."
														: "Selecciona un propietario"
												}
											/>
										</SelectTrigger>
										<SelectContent>
											<SelectItem
												value={NO_OWNER_VALUE}
												label="Sin Propietario"
											>
												Sin propietario
											</SelectItem>
											{owners.map((owner) => (
												<SelectItem key={owner.id} value={owner.id}>
													{owner.name}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="serialNumber">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							const hasSubmitError = serialNumberSubmitError !== null;
							const errors = [
								...field.state.meta.errors,
								...(serialNumberSubmitError
									? [{ message: serialNumberSubmitError }]
									: []),
							];

							return (
								<Field data-invalid={isInvalid || hasSubmitError}>
									<FieldLabel htmlFor={field.name}>
										Numero de serie{" "}
										{trackingMode === TrackingMode.POOLED && (
											<span className="text-muted-foreground text-xs">
												(opcional)
											</span>
										)}
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => {
											if (serialNumberSubmitError) {
												setSerialNumberSubmitError(null);
											}
											field.handleChange(e.target.value);
										}}
										aria-invalid={isInvalid || hasSubmitError}
									/>
									{(isInvalid || hasSubmitError) && (
										<FieldError errors={errors} />
									)}
								</Field>
							);
						}}
					</form.Field>

					<form.Field name="notes">
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid;

							return (
								<Field data-invalid={isInvalid}>
									<FieldLabel htmlFor={field.name}>
										Notas{" "}
										<span className="text-muted-foreground text-xs">
											(opcional)
										</span>
									</FieldLabel>
									<Input
										id={field.name}
										name={field.name}
										type="text"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										aria-invalid={isInvalid}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							);
						}}
					</form.Field>
				</FieldGroup>
			</form>

			{submitErrorMessage && (
				<p className="text-sm text-destructive">{submitErrorMessage}</p>
			)}

			<div className="flex justify-end gap-2">
				<Button type="button" variant="outline" onClick={onCancel}>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => {
						return [state.canSubmit, state.isSubmitting];
					}}
				>
					{([canSubmit, isSubmitting]) => (
						<Button
							type="submit"
							form={formId}
							disabled={!canSubmit || isPending}
						>
							{isSubmitting || isPending ? pendingLabel : submitLabel}
						</Button>
					)}
				</form.Subscribe>
			</div>
		</>
	);
}

function getDirtyValues(
	values: AssetFormValues,
	defaultValues: AssetFormValues,
): Partial<AssetFormValues> {
	const dirtyValues: Partial<AssetFormValues> = {};

	if (values.locationId !== defaultValues.locationId) {
		dirtyValues.locationId = values.locationId;
	}

	if (values.ownerId !== defaultValues.ownerId) {
		dirtyValues.ownerId = values.ownerId;
	}

	if (values.serialNumber !== defaultValues.serialNumber) {
		dirtyValues.serialNumber = values.serialNumber;
	}

	if (values.notes !== defaultValues.notes) {
		dirtyValues.notes = values.notes;
	}

	return dirtyValues;
}

function getSubmitError(error: unknown) {
	if (
		error instanceof ProblemDetailsError &&
		error.problemDetails.status === 409
	) {
		return {
			field: "serialNumber" as const,
			message:
				error.problemDetails.detail ??
				"No se pudo guardar el asset por un conflicto con el numero de serie.",
		};
	}

	return null;
}
