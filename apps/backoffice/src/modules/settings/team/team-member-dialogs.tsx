import type { TenantCollaboratorDto, TenantRoleDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import { Field, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
import { useId, useState } from "react";
import { useAppForm } from "@/shared/contexts/form.context";
import { getTeamErrorMessage } from "./team.errors";
import { useChangeTeamMemberRole, useCreateTeamMember } from "./team.mutations";
import {
	changeTeamMemberRoleFormDefaults,
	changeTeamMemberRoleFormSchema,
	createTeamMemberFormDefaults,
	createTeamMemberFormSchema,
	toChangeTeamMemberRoleDto,
	toCreateTeamMemberDto,
} from "./team-member-form.schema";
import type { TemporaryPasswordResult } from "./temporary-password-dialog";

function RoleSelect({
	id,
	value,
	invalid,
	roles,
	onChange,
}: {
	id: string;
	value: string;
	invalid: boolean;
	roles: TenantRoleDto[];
	onChange: (value: string) => void;
}) {
	return (
		<Select
			value={value}
			onValueChange={(nextValue) => onChange(nextValue ?? "")}
			items={roles.map((role) => ({ value: role.id, label: role.name }))}
		>
			<SelectTrigger id={id} aria-invalid={invalid} className="w-full">
				<SelectValue placeholder="Selecciona un rol" />
			</SelectTrigger>
			<SelectContent>
				{roles.map((role) => (
					<SelectItem key={role.id} value={role.id}>
						{role.name}
						{role.systemRole === "ADMIN" ? " (Administrador)" : ""}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

export function CreateTeamMemberDialog({
	open,
	onOpenChange,
	roles,
	onCreated,
}: {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	roles: TenantRoleDto[];
	onCreated: (result: TemporaryPasswordResult) => void;
}) {
	const formId = useId();
	const mutation = useCreateTeamMember();
	const [error, setError] = useState<string | null>(null);
	const form = useAppForm({
		defaultValues: createTeamMemberFormDefaults(),
		validators: { onSubmit: createTeamMemberFormSchema },
		onSubmit: async ({ value }) => {
			setError(null);
			try {
				const result = await mutation.mutateAsync(toCreateTeamMemberDto(value));
				onOpenChange(false);
				onCreated({
					email: result.collaborator.email,
					password: result.temporaryPassword,
					reason: "created",
				});
			} catch (mutationError) {
				setError(getTeamErrorMessage(mutationError));
			}
		},
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Agregar integrante</DialogTitle>
					<DialogDescription>
						Crea su acceso y asigna el rol inicial. Recibirás una contraseña
						temporal para compartirle.
					</DialogDescription>
				</DialogHeader>
				<form
					id={formId}
					noValidate
					className="space-y-4"
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.Field name="email">
						{(field) => {
							const invalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={invalid}>
									<FieldLabel htmlFor={field.name}>
										Correo electrónico
									</FieldLabel>
									<Input
										id={field.name}
										type="email"
										autoComplete="off"
										value={field.state.value}
										onBlur={field.handleBlur}
										onChange={(event) => field.handleChange(event.target.value)}
										aria-invalid={invalid}
									/>
									{invalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
					<form.Field name="roleId">
						{(field) => {
							const invalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={invalid}>
									<FieldLabel htmlFor={field.name}>Rol</FieldLabel>
									<RoleSelect
										id={field.name}
										value={field.state.value}
										invalid={invalid}
										roles={roles}
										onChange={field.handleChange}
									/>
									{invalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
					{error ? <p className="text-sm text-destructive">{error}</p> : null}
				</form>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={mutation.isPending}
					>
						Cancelar
					</Button>
					<form.Subscribe selector={(state) => state.canSubmit}>
						{(canSubmit) => (
							<Button
								type="submit"
								form={formId}
								disabled={!canSubmit || mutation.isPending}
							>
								{mutation.isPending ? "Agregando..." : "Agregar integrante"}
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export function ChangeTeamMemberRoleDialog({
	member,
	roles,
	onClose,
}: {
	member: TenantCollaboratorDto | null;
	roles: TenantRoleDto[];
	onClose: () => void;
}) {
	const formId = useId();
	const mutation = useChangeTeamMemberRole();
	const [error, setError] = useState<string | null>(null);
	const currentRoleId = member?.role.id ?? "";
	const form = useAppForm({
		defaultValues: changeTeamMemberRoleFormDefaults(currentRoleId),
		validators: { onSubmit: changeTeamMemberRoleFormSchema },
		onSubmit: async ({ value }) => {
			if (!member || value.roleId === member.role.id) return;
			setError(null);
			try {
				await mutation.mutateAsync({
					tenantUserId: member.id,
					body: toChangeTeamMemberRoleDto(value),
				});
				onClose();
			} catch (mutationError) {
				setError(getTeamErrorMessage(mutationError));
			}
		},
	});

	return (
		<Dialog open={member !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Cambiar rol</DialogTitle>
					<DialogDescription>
						Selecciona el nuevo rol para {member?.email}.
					</DialogDescription>
				</DialogHeader>
				<form
					id={formId}
					noValidate
					onSubmit={(event) => {
						event.preventDefault();
						event.stopPropagation();
						form.handleSubmit();
					}}
				>
					<form.Field name="roleId">
						{(field) => {
							const invalid =
								field.state.meta.isTouched && !field.state.meta.isValid;
							return (
								<Field data-invalid={invalid}>
									<FieldLabel htmlFor={field.name}>Rol</FieldLabel>
									<RoleSelect
										id={field.name}
										value={field.state.value}
										invalid={invalid}
										roles={roles}
										onChange={field.handleChange}
									/>
									{invalid ? (
										<FieldError errors={field.state.meta.errors} />
									) : null}
								</Field>
							);
						}}
					</form.Field>
					{error ? (
						<p className="mt-3 text-sm text-destructive">{error}</p>
					) : null}
				</form>
				<DialogFooter>
					<Button
						type="button"
						variant="outline"
						onClick={onClose}
						disabled={mutation.isPending}
					>
						Cancelar
					</Button>
					<form.Subscribe
						selector={(state) =>
							[state.canSubmit, state.values.roleId] as const
						}
					>
						{([canSubmit, roleId]) => (
							<Button
								type="submit"
								form={formId}
								disabled={
									!canSubmit || roleId === currentRoleId || mutation.isPending
								}
							>
								{mutation.isPending ? "Guardando..." : "Guardar rol"}
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
