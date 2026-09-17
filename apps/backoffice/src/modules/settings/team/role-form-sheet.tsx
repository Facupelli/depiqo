import type {
	TenantPermissionMetadataDto,
	TenantRoleDto,
} from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Checkbox } from "@repo/ui/components/checkbox";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldLegend,
	FieldSet,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { useId, useState } from "react";
import { useAppForm } from "@/shared/contexts/form.context";
import {
	createRoleFormDefaults,
	roleFormSchema,
	roleToFormValues,
	toRoleBodyDto,
} from "./role-form.schema";
import { getTeamErrorMessage } from "./team.errors";
import { useCreateTeamRole, useUpdateTeamRole } from "./team.mutations";

type RoleFormMode = { type: "create" } | { type: "edit"; role: TenantRoleDto };

export function RoleFormSheet({
	mode,
	catalog,
	currentRoleId,
	onClose,
}: {
	mode: RoleFormMode;
	catalog: TenantPermissionMetadataDto[];
	currentRoleId: string;
	onClose: () => void;
}) {
	return (
		<Sheet open onOpenChange={(open) => !open && onClose()}>
			<SheetContent className="w-full max-w-full gap-0 overflow-hidden p-0 data-[side=right]:w-[92%] data-[side=right]:sm:max-w-2xl">
				<SheetHeader className="border-b px-5 py-5 sm:px-6">
					<SheetTitle>
						{mode.type === "create" ? "Crear rol" : `Editar ${mode.role.name}`}
					</SheetTitle>
					<SheetDescription>
						Define el nombre y los permisos que tendrá este rol en el equipo.
					</SheetDescription>
				</SheetHeader>
				<RoleForm
					mode={mode}
					catalog={catalog}
					currentRoleId={currentRoleId}
					onClose={onClose}
				/>
			</SheetContent>
		</Sheet>
	);
}

function RoleForm({
	mode,
	catalog,
	currentRoleId,
	onClose,
}: {
	mode: RoleFormMode;
	catalog: TenantPermissionMetadataDto[];
	currentRoleId: string;
	onClose: () => void;
}) {
	const formId = useId();
	const [error, setError] = useState<string | null>(null);
	const createMutation = useCreateTeamRole();
	const updateMutation = useUpdateTeamRole(currentRoleId);
	const isPending = createMutation.isPending || updateMutation.isPending;
	const groups = groupCatalogPermissions(catalog);
	const defaultValues =
		mode.type === "create"
			? createRoleFormDefaults()
			: roleToFormValues(mode.role);
	const form = useAppForm({
		defaultValues,
		validators: { onSubmit: roleFormSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				const body = toRoleBodyDto(value);
				if (mode.type === "create") {
					await createMutation.mutateAsync(body);
				} else {
					await updateMutation.mutateAsync({ roleId: mode.role.id, body });
				}
				onClose();
			} catch (mutationError) {
				setError(getTeamErrorMessage(mutationError));
			}
		},
	});

	return (
		<form
			id={formId}
			noValidate
			className="flex min-h-0 flex-1 flex-col"
			onSubmit={(event) => {
				event.preventDefault();
				event.stopPropagation();
				form.handleSubmit();
			}}
		>
			<div className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6 sm:px-6">
				<form.Field name="name">
					{(field) => {
						const invalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={invalid}>
								<FieldLabel htmlFor={field.name}>Nombre del rol</FieldLabel>
								<Input
									id={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={invalid}
									autoComplete="off"
								/>
								{invalid ? (
									<FieldError errors={field.state.meta.errors} />
								) : null}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name="permissions" mode="array">
					{(field) => (
						<div className="space-y-7">
							{groups.map((group) => (
								<FieldSet key={group.name}>
									<FieldLegend>{group.name}</FieldLegend>
									<FieldGroup className="gap-3">
										{group.permissions.map((permission) => {
											const checkboxId = `${formId}-${permission.id}`;
											const checked = field.state.value.includes(permission.id);
											return (
												<Field
													key={permission.id}
													orientation="horizontal"
													className="rounded-lg border p-4"
												>
													<Checkbox
														id={checkboxId}
														name={field.name}
														checked={checked}
														onCheckedChange={(nextChecked) => {
															if (nextChecked && !checked) {
																field.pushValue(permission.id);
															} else if (!nextChecked) {
																const index = field.state.value.indexOf(
																	permission.id,
																);
																if (index >= 0) field.removeValue(index);
															}
														}}
													/>
													<FieldContent>
														<FieldLabel
															htmlFor={checkboxId}
															className="font-medium"
														>
															{permission.label}
														</FieldLabel>
														<FieldDescription>
															{permission.description}
														</FieldDescription>
													</FieldContent>
												</Field>
											);
										})}
									</FieldGroup>
								</FieldSet>
							))}
						</div>
					)}
				</form.Field>
				{error ? (
					<p className="text-sm text-destructive" role="alert">
						{error}
					</p>
				) : null}
			</div>

			<SheetFooter className="flex-row justify-end border-t px-5 py-4 sm:px-6">
				<Button
					type="button"
					variant="outline"
					onClick={onClose}
					disabled={isPending}
				>
					Cancelar
				</Button>
				<form.Subscribe
					selector={(state) => [state.canSubmit, state.isDirty] as const}
				>
					{([canSubmit, isDirty]) => (
						<Button
							type="submit"
							disabled={!canSubmit || !isDirty || isPending}
						>
							{isPending
								? "Guardando..."
								: mode.type === "create"
									? "Crear rol"
									: "Guardar cambios"}
						</Button>
					)}
				</form.Subscribe>
			</SheetFooter>
		</form>
	);
}

type PermissionGroup = {
	name: string;
	permissions: TenantPermissionMetadataDto[];
};

function groupCatalogPermissions(
	catalog: TenantPermissionMetadataDto[],
): PermissionGroup[] {
	const groups: PermissionGroup[] = [];
	const groupsByName = new Map<string, PermissionGroup>();
	for (const permission of catalog) {
		let group = groupsByName.get(permission.group);
		if (!group) {
			group = { name: permission.group, permissions: [] };
			groupsByName.set(permission.group, group);
			groups.push(group);
		}
		group.permissions.push(permission);
	}
	return groups;
}
