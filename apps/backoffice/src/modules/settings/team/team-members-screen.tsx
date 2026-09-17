import {
	type TenantCollaboratorDto,
	TenantPermission,
} from "@repo/api-contracts";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import {
	MoreHorizontal,
	Plus,
	RotateCcw,
	ShieldCheck,
	UserRoundX,
} from "lucide-react";
import { useState } from "react";
import { can } from "@/auth/permissions";
import { getTeamErrorMessage } from "./team.errors";
import {
	useReactivateTeamMember,
	useResetTeamMemberPassword,
	useSuspendTeamMember,
} from "./team.mutations";
import { useTeamMembers, useTeamRoles } from "./team.queries";
import {
	ChangeTeamMemberRoleDialog,
	CreateTeamMemberDialog,
} from "./team-member-dialogs";
import {
	TemporaryPasswordDialog,
	type TemporaryPasswordResult,
} from "./temporary-password-dialog";

type ConfirmAction = {
	kind: "suspend" | "reset-password";
	member: TenantCollaboratorDto;
};

export function TeamMembersScreen({
	permissions,
	currentUserId,
}: {
	permissions: readonly TenantPermission[];
	currentUserId: string;
}) {
	const canManage = can(permissions, TenantPermission.TeamManage);
	const membersQuery = useTeamMembers();
	const rolesQuery = useTeamRoles(canManage);
	const suspendMutation = useSuspendTeamMember();
	const reactivateMutation = useReactivateTeamMember();
	const resetPasswordMutation = useResetTeamMemberPassword();
	const [createOpen, setCreateOpen] = useState(false);
	const [roleTarget, setRoleTarget] = useState<TenantCollaboratorDto | null>(
		null,
	);
	const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(
		null,
	);
	const [temporaryPassword, setTemporaryPassword] =
		useState<TemporaryPasswordResult | null>(null);
	const [actionError, setActionError] = useState<string | null>(null);

	async function reactivate(member: TenantCollaboratorDto) {
		setActionError(null);
		try {
			await reactivateMutation.mutateAsync(member.id);
		} catch (error) {
			setActionError(getTeamErrorMessage(error));
		}
	}

	async function confirm() {
		if (!confirmAction) return;
		setActionError(null);
		try {
			if (confirmAction.kind === "suspend") {
				await suspendMutation.mutateAsync(confirmAction.member.id);
			} else {
				const result = await resetPasswordMutation.mutateAsync(
					confirmAction.member.id,
				);
				setTemporaryPassword({
					email: result.collaborator.email,
					password: result.temporaryPassword,
					reason: "reset",
				});
			}
			setConfirmAction(null);
		} catch (error) {
			setActionError(getTeamErrorMessage(error));
		}
	}

	const isConfirming =
		suspendMutation.isPending || resetPasswordMutation.isPending;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					Personas con acceso al Backoffice y su rol actual.
				</p>
				{canManage ? (
					<Button
						onClick={() => setCreateOpen(true)}
						disabled={rolesQuery.isPending || rolesQuery.isError}
					>
						<Plus /> Agregar integrante
					</Button>
				) : null}
			</div>

			{actionError ? (
				<div
					role="alert"
					className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{actionError}
				</div>
			) : null}

			{rolesQuery.isError && canManage ? (
				<div
					role="alert"
					className="rounded-lg border bg-card px-4 py-3 text-sm"
				>
					No pudimos cargar los roles. Actualiza la página para administrar
					integrantes.
				</div>
			) : null}

			<div className="overflow-hidden rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Integrante</TableHead>
							<TableHead>Rol</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead className="hidden lg:table-cell">Creado</TableHead>
							{canManage ? (
								<TableHead className="w-12">
									<span className="sr-only">Acciones</span>
								</TableHead>
							) : null}
						</TableRow>
					</TableHeader>
					<TableBody>
						{membersQuery.isPending ? (
							<LoadingRows columns={canManage ? 5 : 4} />
						) : null}
						{membersQuery.isError ? (
							<TableRow>
								<TableCell
									colSpan={canManage ? 5 : 4}
									className="h-28 text-center text-muted-foreground"
								>
									No pudimos cargar el equipo. Inténtalo nuevamente.
								</TableCell>
							</TableRow>
						) : null}
						{membersQuery.data?.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={canManage ? 5 : 4}
									className="h-28 text-center text-muted-foreground"
								>
									Todavía no hay integrantes para mostrar.
								</TableCell>
							</TableRow>
						) : null}
						{membersQuery.data?.map((member) => {
							const isSelf = member.id === currentUserId;
							return (
								<TableRow key={member.id}>
									<TableCell className="font-medium">
										<div>
											{member.email}
											{isSelf ? (
												<span className="ml-2 text-xs font-normal text-muted-foreground">
													Tú
												</span>
											) : null}
										</div>
										{member.mustChangePassword ? (
											<p className="mt-0.5 text-xs font-normal text-muted-foreground">
												Debe cambiar la contraseña
											</p>
										) : null}
									</TableCell>
									<TableCell>
										<span className="inline-flex items-center gap-1.5">
											{member.role.systemRole === "ADMIN" ? (
												<ShieldCheck className="size-4 text-blue-700" />
											) : null}
											{member.role.name}
										</span>
									</TableCell>
									<TableCell>
										<StatusBadge status={member.status} />
									</TableCell>
									<TableCell className="hidden text-muted-foreground lg:table-cell">
										{formatCreatedAt(member.createdAt)}
									</TableCell>
									{canManage ? (
										<TableCell>
											{!isSelf ? (
												<MemberActions
													member={member}
													rolesAvailable={
														!rolesQuery.isPending && !rolesQuery.isError
													}
													onChangeRole={setRoleTarget}
													onSuspend={(target) =>
														setConfirmAction({
															kind: "suspend",
															member: target,
														})
													}
													onReactivate={reactivate}
													onResetPassword={(target) =>
														setConfirmAction({
															kind: "reset-password",
															member: target,
														})
													}
												/>
											) : null}
										</TableCell>
									) : null}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			{canManage && createOpen ? (
				<CreateTeamMemberDialog
					key="create-member"
					open={createOpen}
					onOpenChange={setCreateOpen}
					roles={rolesQuery.data ?? []}
					onCreated={setTemporaryPassword}
				/>
			) : null}
			{canManage && roleTarget ? (
				<ChangeTeamMemberRoleDialog
					key={roleTarget.id}
					member={roleTarget}
					roles={rolesQuery.data ?? []}
					onClose={() => setRoleTarget(null)}
				/>
			) : null}
			<MemberConfirmationDialog
				action={confirmAction}
				isPending={isConfirming}
				error={actionError}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmAction(null);
						setActionError(null);
					}
				}}
				onConfirm={confirm}
			/>
			{temporaryPassword ? (
				<TemporaryPasswordDialog
					key={temporaryPassword.password}
					result={temporaryPassword}
					onClose={() => setTemporaryPassword(null)}
				/>
			) : null}
		</div>
	);
}

function StatusBadge({ status }: { status: TenantCollaboratorDto["status"] }) {
	return status === "ACTIVE" ? (
		<Badge
			variant="outline"
			className="border-emerald-200 bg-emerald-50 text-emerald-700"
		>
			Activo
		</Badge>
	) : (
		<Badge variant="secondary">Suspendido</Badge>
	);
}

function MemberActions({
	member,
	rolesAvailable,
	onChangeRole,
	onSuspend,
	onReactivate,
	onResetPassword,
}: {
	member: TenantCollaboratorDto;
	rolesAvailable: boolean;
	onChangeRole: (member: TenantCollaboratorDto) => void;
	onSuspend: (member: TenantCollaboratorDto) => void;
	onReactivate: (member: TenantCollaboratorDto) => void;
	onResetPassword: (member: TenantCollaboratorDto) => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Acciones para ${member.email}`}
					/>
				}
			>
				<MoreHorizontal />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-52">
				{rolesAvailable ? (
					<DropdownMenuItem onClick={() => onChangeRole(member)}>
						Cambiar rol
					</DropdownMenuItem>
				) : null}
				<DropdownMenuItem onClick={() => onResetPassword(member)}>
					Restablecer contraseña
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				{member.status === "ACTIVE" ? (
					<DropdownMenuItem
						className="text-destructive focus:text-destructive"
						onClick={() => onSuspend(member)}
					>
						<UserRoundX /> Suspender
					</DropdownMenuItem>
				) : (
					<DropdownMenuItem onClick={() => onReactivate(member)}>
						<RotateCcw /> Reactivar
					</DropdownMenuItem>
				)}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function MemberConfirmationDialog({
	action,
	isPending,
	error,
	onOpenChange,
	onConfirm,
}: {
	action: ConfirmAction | null;
	isPending: boolean;
	error: string | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: () => Promise<void>;
}) {
	const isSuspension = action?.kind === "suspend";
	return (
		<AlertDialog open={action !== null} onOpenChange={onOpenChange}>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>
						{isSuspension ? "Suspender integrante" : "Restablecer contraseña"}
					</AlertDialogTitle>
					<AlertDialogDescription>
						{isSuspension
							? `Se impedirá el acceso de ${action?.member.email} hasta que sea reactivado.`
							: `Se invalidarán las sesiones y credenciales actuales de ${action?.member.email}. Recibirás una nueva contraseña temporal para compartirle.`}
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? <p className="text-sm text-destructive">{error}</p> : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
					<AlertDialogAction
						onClick={onConfirm}
						disabled={isPending}
						className={
							isSuspension
								? "bg-destructive text-white hover:bg-destructive/90"
								: undefined
						}
					>
						{isPending
							? "Procesando..."
							: isSuspension
								? "Suspender"
								: "Restablecer"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

const loadingRowIds = ["first", "second", "third", "fourth"] as const;
const loadingCellIds = [
	"email",
	"role",
	"status",
	"created",
	"actions",
] as const;

function LoadingRows({ columns }: { columns: number }) {
	return loadingRowIds.map((rowId) => (
		<TableRow key={rowId}>
			{loadingCellIds.slice(0, columns).map((cellId) => (
				<TableCell key={cellId}>
					<Skeleton className="h-5 w-full max-w-36" />
				</TableCell>
			))}
		</TableRow>
	));
}

function formatCreatedAt(value: string): string {
	return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(
		new Date(value),
	);
}
