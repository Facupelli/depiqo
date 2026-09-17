import {
	TenantPermission,
	type TenantPermission as TenantPermissionId,
	type TenantPermissionMetadataDto,
	type TenantRoleDto,
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
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@repo/ui/components/dialog";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
	Eye,
	MoreHorizontal,
	Pencil,
	Plus,
	ShieldCheck,
	Trash2,
} from "lucide-react";
import { useState } from "react";
import { can } from "@/auth/permissions";
import { getProblemDetailsCode } from "@/shared/errors";
import { RoleFormSheet } from "./role-form-sheet";
import { getTeamErrorMessage } from "./team.errors";
import { useDeleteTeamRole } from "./team.mutations";
import { useTeamPermissionCatalog, useTeamRoles } from "./team.queries";

type RoleFormSelection =
	| { type: "create" }
	| { type: "edit"; role: TenantRoleDto };

export function TeamRolesScreen({
	permissions,
	currentRoleId,
}: {
	permissions: readonly TenantPermissionId[];
	currentRoleId: string;
}) {
	const rolesQuery = useTeamRoles();
	const catalogQuery = useTeamPermissionCatalog();
	const [selectedRole, setSelectedRole] = useState<TenantRoleDto | null>(null);
	const [formSelection, setFormSelection] = useState<RoleFormSelection | null>(
		null,
	);
	const [editSafetyMessage, setEditSafetyMessage] = useState<string | null>(
		null,
	);
	const [roleToDelete, setRoleToDelete] = useState<TenantRoleDto | null>(null);
	const [deleteStatusMessage, setDeleteStatusMessage] = useState<string | null>(
		null,
	);
	const canManage = can(permissions, TenantPermission.TeamManage);

	function openEdit(role: TenantRoleDto) {
		if (role.systemRole === "ADMIN" || !catalogQuery.data) return;
		const catalogIds = new Set(
			catalogQuery.data.map((permission) => permission.id),
		);
		if (role.permissions.some((permission) => !catalogIds.has(permission))) {
			setEditSafetyMessage(
				"Este rol contiene permisos que no figuran en el catálogo actual. No puede editarse sin riesgo de perder datos de autorización.",
			);
			return;
		}
		setEditSafetyMessage(null);
		setFormSelection({ type: "edit", role });
	}

	function openDelete(role: TenantRoleDto) {
		if (role.systemRole === "ADMIN" || role.isInUse) return;
		setDeleteStatusMessage(null);
		setRoleToDelete(role);
	}

	const columnCount = canManage ? 5 : 4;

	return (
		<div className="space-y-4">
			<div className="flex flex-wrap items-start justify-between gap-3">
				<p className="text-sm text-muted-foreground">
					Consulta los roles del equipo y los permisos incluidos en cada uno.
				</p>
				{canManage && catalogQuery.data ? (
					<Button onClick={() => setFormSelection({ type: "create" })}>
						<Plus /> Crear rol
					</Button>
				) : null}
			</div>

			{canManage && catalogQuery.isError ? (
				<p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
					No pudimos cargar el catálogo de permisos. Puedes consultar los roles,
					pero no crearlos ni editarlos por el momento.
				</p>
			) : null}
			{editSafetyMessage ? (
				<div
					role="alert"
					className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
				>
					{editSafetyMessage}
				</div>
			) : null}
			{deleteStatusMessage ? (
				<div
					role="alert"
					className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
				>
					{deleteStatusMessage}
				</div>
			) : null}

			<div className="overflow-hidden rounded-lg border bg-card">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Rol</TableHead>
							<TableHead>Tipo</TableHead>
							<TableHead>Permisos</TableHead>
							<TableHead>Integrantes</TableHead>
							{canManage ? (
								<TableHead className="w-12">
									<span className="sr-only">Acciones</span>
								</TableHead>
							) : null}
						</TableRow>
					</TableHeader>
					<TableBody>
						{rolesQuery.isPending ? (
							<RolesLoadingRows columnCount={columnCount} />
						) : null}
						{rolesQuery.isError ? (
							<TableRow>
								<TableCell
									colSpan={columnCount}
									className="h-28 text-center text-muted-foreground"
								>
									No pudimos cargar los roles. Inténtalo nuevamente.
								</TableCell>
							</TableRow>
						) : null}
						{rolesQuery.data?.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columnCount}
									className="h-28 text-center text-muted-foreground"
								>
									Todavía no hay roles para mostrar.
								</TableCell>
							</TableRow>
						) : null}
						{rolesQuery.data?.map((role) => {
							const isAdministrator = role.systemRole === "ADMIN";
							return (
								<TableRow key={role.id}>
									<TableCell>
										<button
											type="button"
											className="inline-flex items-center gap-2 text-left font-medium hover:text-primary hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
											onClick={() => setSelectedRole(role)}
										>
											{isAdministrator ? (
												<ShieldCheck className="size-4 text-blue-700" />
											) : null}
											{role.name}
										</button>
									</TableCell>
									<TableCell>
										<RoleTypeBadge role={role} />
									</TableCell>
									<TableCell>
										{formatCount(role.permissions.length, "permiso")}
									</TableCell>
									<TableCell>
										{formatCount(role.assignedUserCount, "integrante")}
									</TableCell>
									{canManage ? (
										<TableCell>
											<RoleActions
												role={role}
												canEdit={Boolean(catalogQuery.data) && !isAdministrator}
												onView={() => setSelectedRole(role)}
												onEdit={() => openEdit(role)}
												onDelete={() => openDelete(role)}
											/>
										</TableCell>
									) : null}
								</TableRow>
							);
						})}
					</TableBody>
				</Table>
			</div>

			<RoleDetailDialog
				role={selectedRole}
				catalog={catalogQuery.data}
				catalogPending={catalogQuery.isPending}
				catalogError={catalogQuery.isError}
				onOpenChange={(open) => {
					if (!open) setSelectedRole(null);
				}}
			/>
			<DeleteRoleDialog
				role={roleToDelete}
				onClose={() => setRoleToDelete(null)}
				onStaleError={(message) => {
					setRoleToDelete(null);
					setDeleteStatusMessage(message);
				}}
			/>
			{formSelection && catalogQuery.data ? (
				<RoleFormSheet
					key={
						formSelection.type === "create" ? "create" : formSelection.role.id
					}
					mode={formSelection}
					catalog={catalogQuery.data}
					currentRoleId={currentRoleId}
					onClose={() => setFormSelection(null)}
				/>
			) : null}
		</div>
	);
}

function RoleActions({
	role,
	canEdit,
	onView,
	onEdit,
	onDelete,
}: {
	role: TenantRoleDto;
	canEdit: boolean;
	onView: () => void;
	onEdit: () => void;
	onDelete: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Acciones para ${role.name}`}
					/>
				}
			>
				<MoreHorizontal />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				<DropdownMenuItem onClick={onView}>
					<Eye /> Ver detalles
				</DropdownMenuItem>
				{canEdit ? (
					<DropdownMenuItem onClick={onEdit}>
						<Pencil /> Editar rol
					</DropdownMenuItem>
				) : null}
				{role.systemRole !== "ADMIN" ? (
					<DropdownMenuItem
						disabled={role.isInUse}
						onClick={onDelete}
						className="text-destructive focus:text-destructive"
						title={
							role.isInUse
								? "No se puede eliminar porque tiene integrantes asignados"
								: undefined
						}
					>
						<Trash2 />
						{role.isInUse ? "Eliminar rol (en uso)" : "Eliminar rol"}
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function DeleteRoleDialog({
	role,
	onClose,
	onStaleError,
}: {
	role: TenantRoleDto | null;
	onClose: () => void;
	onStaleError: (message: string) => void;
}) {
	const deleteMutation = useDeleteTeamRole();
	const [error, setError] = useState<string | null>(null);

	async function handleDelete() {
		if (!role) return;
		setError(null);
		try {
			await deleteMutation.mutateAsync(role.id);
			onClose();
		} catch (mutationError) {
			const message = getTeamErrorMessage(mutationError);
			const code = getProblemDetailsCode(mutationError);
			if (
				code === "tenant_management.role_in_use" ||
				code === "tenant_management.role_not_found"
			) {
				onStaleError(message);
				return;
			}
			setError(message);
		}
	}

	return (
		<AlertDialog
			open={role !== null}
			onOpenChange={(open) => {
				if (!open && !deleteMutation.isPending) {
					setError(null);
					onClose();
				}
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Eliminar rol</AlertDialogTitle>
					<AlertDialogDescription>
						Se eliminará el rol “{role?.name}”. Esta acción no se puede
						deshacer.
					</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error}
					</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={deleteMutation.isPending}>
						Cancelar
					</AlertDialogCancel>
					<AlertDialogAction
						onClick={handleDelete}
						disabled={deleteMutation.isPending}
						className="bg-destructive text-white hover:bg-destructive/90"
					>
						{deleteMutation.isPending ? "Eliminando..." : "Eliminar rol"}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}

function RoleTypeBadge({ role }: { role: TenantRoleDto }) {
	return role.systemRole === "ADMIN" ? (
		<Badge
			variant="outline"
			className="border-blue-200 bg-blue-50 text-blue-700"
		>
			Sistema
		</Badge>
	) : (
		<Badge variant="secondary">Personalizado</Badge>
	);
}

function RoleDetailDialog({
	role,
	catalog,
	catalogPending,
	catalogError,
	onOpenChange,
}: {
	role: TenantRoleDto | null;
	catalog: TenantPermissionMetadataDto[] | undefined;
	catalogPending: boolean;
	catalogError: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	return (
		<Dialog open={role !== null} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
				{role ? (
					<>
						<DialogHeader>
							<div className="flex flex-wrap items-center gap-2 pr-8">
								{role.systemRole === "ADMIN" ? (
									<ShieldCheck className="size-5 text-blue-700" />
								) : null}
								<DialogTitle>{role.name}</DialogTitle>
								<RoleTypeBadge role={role} />
							</div>
							<DialogDescription>
								{formatCount(role.assignedUserCount, "integrante")} con este
								rol.
							</DialogDescription>
						</DialogHeader>
						{catalogPending ? <PermissionDetailLoading /> : null}
						{catalogError ? (
							<div
								role="alert"
								className="rounded-lg border bg-muted/30 px-4 py-3 text-sm"
							>
								No pudimos cargar el detalle de permisos. Inténtalo nuevamente
								más tarde.
							</div>
						) : null}
						{catalog ? (
							<PermissionGroups role={role} catalog={catalog} />
						) : null}
					</>
				) : null}
			</DialogContent>
		</Dialog>
	);
}

type PermissionGroup = {
	name: string;
	permissions: TenantPermissionMetadataDto[];
};

function PermissionGroups({
	role,
	catalog,
}: {
	role: TenantRoleDto;
	catalog: TenantPermissionMetadataDto[];
}) {
	const selectedIds = new Set<TenantPermissionId>(role.permissions);
	const knownIds = new Set<TenantPermissionId>();
	const groups: PermissionGroup[] = [];
	const groupsByName = new Map<string, PermissionGroup>();
	for (const permission of catalog) {
		knownIds.add(permission.id);
		if (!selectedIds.has(permission.id)) continue;
		let group = groupsByName.get(permission.group);
		if (!group) {
			group = { name: permission.group, permissions: [] };
			groupsByName.set(permission.group, group);
			groups.push(group);
		}
		group.permissions.push(permission);
	}
	const unknownIds = role.permissions.filter((id) => !knownIds.has(id));
	return (
		<div className="space-y-5">
			{role.permissions.length === 0 ? (
				<p className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
					Este rol no tiene permisos asignados.
				</p>
			) : null}
			{groups.map((group) => (
				<section key={group.name} className="space-y-2">
					<h3 className="text-sm font-semibold">{group.name}</h3>
					<div className="divide-y rounded-lg border">
						{group.permissions.map((permission) => (
							<div key={permission.id} className="space-y-1 px-4 py-3">
								<p className="text-sm font-medium">{permission.label}</p>
								<p className="text-sm text-muted-foreground">
									{permission.description}
								</p>
							</div>
						))}
					</div>
				</section>
			))}
			{unknownIds.length > 0 ? (
				<div
					role="alert"
					className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
				>
					<p className="font-medium">
						Hay permisos que no figuran en el catálogo actual.
					</p>
					<p className="mt-1 break-words text-xs">{unknownIds.join(", ")}</p>
				</div>
			) : null}
		</div>
	);
}

function PermissionDetailLoading() {
	return (
		<div className="space-y-4">
			<Skeleton className="h-5 w-32" />
			<div className="space-y-3 rounded-lg border p-4">
				<Skeleton className="h-4 w-48" />
				<Skeleton className="h-4 w-full" />
				<Skeleton className="h-4 w-4/5" />
			</div>
		</div>
	);
}

const loadingRowIds = ["first", "second", "third"] as const;
const loadingCellIds = [
	"role",
	"type",
	"permissions",
	"members",
	"actions",
] as const;
function RolesLoadingRows({ columnCount }: { columnCount: number }) {
	return loadingRowIds.map((rowId) => (
		<TableRow key={rowId}>
			{loadingCellIds.slice(0, columnCount).map((cellId) => (
				<TableCell key={cellId}>
					<Skeleton className="h-5 w-full max-w-32" />
				</TableCell>
			))}
		</TableRow>
	));
}

function formatCount(count: number, singular: string): string {
	return `${count} ${singular}${count === 1 ? "" : "s"}`;
}
