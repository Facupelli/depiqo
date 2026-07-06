import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ReactNode, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAddAssetsToEquipmentType } from "@/features/asset-inventory/equipment-types/add-assets-to-equipment-type/add-assets-to-equipment-type.mutation";
import { toAddAssetsToEquipmentTypeDto } from "@/features/asset-inventory/equipment-types/add-assets-to-equipment-type/add-assets-to-equipment-type.schema";
import { AddAssetsToEquipmentTypeForm } from "@/features/asset-inventory/equipment-types/add-assets-to-equipment-type/add-assets-to-equipment-type-form";
import { useCreateEquipmentTypeAccessoryDefaults } from "@/features/asset-inventory/equipment-types/create-equipment-type-accessory-defaults/create-equipment-type-accessory-defaults.mutation";
import { toCreateEquipmentTypeAccessoryDefaultsDto } from "@/features/asset-inventory/equipment-types/create-equipment-type-accessory-defaults/create-equipment-type-accessory-defaults.schema";
import { CreateEquipmentTypeAccessoryDefaultsForm } from "@/features/asset-inventory/equipment-types/create-equipment-type-accessory-defaults/create-equipment-type-accessory-defaults-form";
import { equipmentTypeQueries } from "@/features/asset-inventory/equipment-types/equipment-types.queries";
import { useOwners } from "@/features/asset-inventory/owners/owners.queries";
import { useBranches } from "@/features/tenant-management/branch/branch.queries";
import { AdminRouteError } from "@/shared/components/admin-route-error";

export const Route = createFileRoute(
	"/_admin/dashboard/inventory/equipment-types/$equipmentTypeId",
)({
	loader: ({ context: { queryClient }, params: { equipmentTypeId } }) =>
		queryClient.ensureQueryData(equipmentTypeQueries.detail(equipmentTypeId)),
	errorComponent: ({ error }) => {
		return (
			<AdminRouteError
				error={error}
				genericMessage="No pudimos cargar el detalle del equipo."
				forbiddenMessage="No tienes permisos para ver este equipo."
			/>
		);
	},
	component: EquipmentTypeDetailPage,
});

function EquipmentTypeDetailPage() {
	const { equipmentTypeId } = Route.useParams();
	const { data: equipmentType } = useSuspenseQuery(
		equipmentTypeQueries.detail(equipmentTypeId),
	);

	return (
		<div className="space-y-6 p-8">
			<header className="space-y-2">
				<div className="flex flex-wrap items-center gap-3">
					<h1 className="font-semibold text-2xl tracking-tight">
						{equipmentType.name}
					</h1>
					<EquipmentTypeStatusBadge isActive={equipmentType.isActive} />
				</div>
				<p className="max-w-3xl text-muted-foreground text-sm">
					{equipmentType.description ?? "Sin descripción."}
				</p>
			</header>

			<EquipmentTypeInfoCard equipmentType={equipmentType} />

			<Tabs defaultValue="assets" className="flex flex-col gap-y-4">
				<div className="flex items-center justify-between gap-4 border-b">
					<TabsList
						variant="line"
						className="h-auto justify-start rounded-none border-b-0 bg-transparent p-0"
					>
						<TabsTrigger
							value="assets"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:border-t-transparent data-active:border-l-transparent data-active:border-r-transparent data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							Assets
						</TabsTrigger>
						<TabsTrigger
							value="accessory-defaults"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:border-t-transparent data-active:border-l-transparent data-active:border-r-transparent data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							Accesorios por defecto
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="assets" className="mt-0">
					<AssetsTable equipmentType={equipmentType} />
				</TabsContent>

				<TabsContent value="accessory-defaults" className="mt-0">
					<AccessoryDefaultsTable equipmentType={equipmentType} />
				</TabsContent>
			</Tabs>
		</div>
	);
}

function EquipmentTypeInfoCard({
	equipmentType,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
}) {
	return (
		<section className="overflow-hidden rounded-lg border bg-background shadow-sm">
			<div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
				<InfoItem label="ID" value={equipmentType.id} />
				<InfoItem label="Assets" value={String(equipmentType.assets.length)} />
				<InfoItem
					label="Accessory defaults"
					value={String(equipmentType.accessoryDefaults.length)}
				/>
				<InfoItem
					label="Estado"
					value={equipmentType.isActive ? "Activo" : "Inactivo"}
				/>
			</div>
			<div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
				<InfoItem
					label="Creado"
					value={formatDateTime(equipmentType.createdAt)}
				/>
				<InfoItem
					label="Actualizado"
					value={formatDateTime(equipmentType.updatedAt)}
				/>
			</div>
		</section>
	);
}

function InfoItem({ label, value }: { label: string; value: string }) {
	return (
		<div className="min-w-0 p-4">
			<p className="text-muted-foreground text-xs uppercase tracking-wide">
				{label}
			</p>
			<p className="mt-1 truncate font-medium text-sm">{value}</p>
		</div>
	);
}

function AssetsTable({
	equipmentType,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
}) {
	return (
		<DetailTable
			title="Assets"
			colSpan={5}
			isEmpty={equipmentType.assets.length === 0}
			emptyMessage="No hay assets para este equipo."
			actions={<AddAssetsDialog equipmentTypeId={equipmentType.id} />}
		>
			<TableHeader>
				<TableRow className="bg-muted/80">
					<TableHead className="pl-4">Serial number</TableHead>
					<TableHead>Sucursal</TableHead>
					<TableHead>Estado</TableHead>
					<TableHead>Owner</TableHead>
					<TableHead>Última actualización</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{equipmentType.assets.map((asset) => (
					<TableRow key={asset.id}>
						<TableCell className="font-medium pl-4">
							{asset.serialNumber ?? "-"}
						</TableCell>
						<TableCell>{asset.branchName ?? asset.branchId}</TableCell>
						<TableCell>
							<AssetStatusBadge status={asset.status} />
						</TableCell>
						<TableCell>{asset.ownerName ?? asset.ownerId ?? "—"}</TableCell>
						<TableCell className="text-muted-foreground">
							{formatDateTime(asset.lastUpdate)}
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</DetailTable>
	);
}

function AccessoryDefaultsTable({
	equipmentType,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
}) {
	return (
		<DetailTable
			title="Accesorios por defecto"
			colSpan={3}
			isEmpty={equipmentType.accessoryDefaults.length === 0}
			emptyMessage="No hay accessory defaults definidos."
			actions={<CreateAccessoryDefaultsDialog equipmentType={equipmentType} />}
		>
			<TableHeader>
				<TableRow className="bg-muted/80">
					<TableHead className="pl-4">Accessory equipment type</TableHead>
					<TableHead>Cantidad</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{equipmentType.accessoryDefaults.map((accessoryDefault) => (
					<TableRow key={accessoryDefault.id}>
						<TableCell className="pl-4">
							{accessoryDefault.accessoryEquipmentTypeName}
						</TableCell>
						<TableCell>{accessoryDefault.quantity}</TableCell>
					</TableRow>
				))}
			</TableBody>
		</DetailTable>
	);
}

function CreateAccessoryDefaultsDialog({
	equipmentType,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
}) {
	const [open, setOpen] = useState(false);
	const formId = useId();
	const { mutateAsync: createEquipmentTypeAccessoryDefaults, isPending } =
		useCreateEquipmentTypeAccessoryDefaults();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => setOpen(true)}
			>
				Agregar accesorios por defecto
			</Button>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>Agregar accesorios por defecto</DialogTitle>
					<DialogDescription>
						Selecciona uno o más tipos de equipo que se agregan por defecto a
						{` ${equipmentType.name}`}.
					</DialogDescription>
				</DialogHeader>
				<CreateEquipmentTypeAccessoryDefaultsForm
					key={open ? "open" : "closed"}
					formId={formId}
					equipmentTypeId={equipmentType.id}
					existingAccessoryEquipmentTypeIds={equipmentType.accessoryDefaults.map(
						(accessoryDefault) => accessoryDefault.accessoryEquipmentTypeId,
					)}
					isPending={isPending}
					onCancel={() => setOpen(false)}
					onSubmit={async (values) => {
						await createEquipmentTypeAccessoryDefaults({
							equipmentTypeId: equipmentType.id,
							body: toCreateEquipmentTypeAccessoryDefaultsDto(values),
						});
						setOpen(false);
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}

function AddAssetsDialog({ equipmentTypeId }: { equipmentTypeId: string }) {
	const [open, setOpen] = useState(false);
	const formId = useId();
	const { data: branches = [] } = useBranches({ isActive: true });
	const { data: owners = [] } = useOwners();
	const { mutateAsync: addAssetsToEquipmentType, isPending } =
		useAddAssetsToEquipmentType();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => setOpen(true)}
			>
				Agregar asset
			</Button>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Agregar assets</DialogTitle>
					<DialogDescription>
						Carga una o más unidades físicas para este tipo de equipo.
					</DialogDescription>
				</DialogHeader>
				<AddAssetsToEquipmentTypeForm
					key={open ? "open" : "closed"}
					formId={formId}
					branches={branches}
					owners={owners}
					isPending={isPending}
					onCancel={() => setOpen(false)}
					onSubmit={async (values) => {
						await addAssetsToEquipmentType({
							equipmentTypeId,
							body: toAddAssetsToEquipmentTypeDto(values),
						});
						setOpen(false);
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}

function DetailTable({
	children,
	colSpan,
	isEmpty,
	emptyMessage,
	title,
	actions,
}: {
	children: ReactNode;
	colSpan: number;
	isEmpty: boolean;
	emptyMessage: string;
	title: string;
	actions?: ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-lg border bg-background shadow-sm">
			<div className="flex justify-between items-start border-b px-4 py-3">
				<h2 className="font-semibold text-base tracking-tight">{title}</h2>
				{actions}
			</div>
			<Table>
				{children}
				{isEmpty ? (
					<TableBody>
						<TableRow>
							<TableCell
								colSpan={colSpan}
								className="h-24 text-center text-muted-foreground"
							>
								{emptyMessage}
							</TableCell>
						</TableRow>
					</TableBody>
				) : null}
			</Table>
		</section>
	);
}

function EquipmentTypeStatusBadge({ isActive }: { isActive: boolean }) {
	return isActive ? (
		<Badge className="bg-emerald-600 text-white">Activo</Badge>
	) : (
		<Badge variant="secondary">Inactivo</Badge>
	);
}

function AssetStatusBadge({
	status,
}: {
	status: GetEquipmentTypeDetailResponseDto["assets"][number]["status"];
}) {
	if (status === "ACTIVE") {
		return <Badge className="bg-emerald-600 text-white">Activo</Badge>;
	}
	if (status === "INACTIVE") {
		return <Badge variant="secondary">Inactivo</Badge>;
	}
	return <Badge variant="outline">Retirado</Badge>;
}

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("es-AR", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(value));
}
