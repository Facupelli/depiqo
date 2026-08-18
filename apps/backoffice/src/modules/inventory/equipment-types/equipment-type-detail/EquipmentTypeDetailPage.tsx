import type { GetEquipmentTypeDetailResponseDto } from "@repo/api-contracts";
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
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@repo/ui/components/tabs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { type ReactNode, useId, useState } from "react";
import { formatTimestampInTimezone } from "@/lib/dates/format";
import { useOwnerOptions } from "@/modules/inventory/ownership/owner-options.queries";
import { useBranches } from "@/modules/settings/branches/public";
import { useTenantTimezone } from "@/shared/timezone/operational-timezone.hooks";
import { AddAccessorySuggestionsForm } from "../accessory-suggestions/AddAccessorySuggestionsForm";
import { useAddAccessorySuggestions } from "../accessory-suggestions/add-accessory-suggestions.mutation";
import { toAddAccessorySuggestionsDto } from "../accessory-suggestions/add-accessory-suggestions.schema";
import { AddUnitsForm } from "../add-units/AddUnitsForm";
import { useAddUnitsToEquipmentType } from "../add-units/add-units.mutation";
import { toAddUnitsToEquipmentTypeDto } from "../add-units/add-units.schema";
import { equipmentTypeDetailQueries } from "./equipment-type-detail.queries";

export function EquipmentTypeDetailPage({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	const { data: equipmentType } = useSuspenseQuery(
		equipmentTypeDetailQueries.detail(equipmentTypeId),
	);
	const timezone = useTenantTimezone();

	return (
		<div className="space-y-6 p-8">
			<header className="space-y-2">
				<h1 className="font-semibold text-2xl tracking-tight">
					{equipmentType.name}
				</h1>
				<p className="max-w-3xl text-muted-foreground text-sm">
					{equipmentType.description ?? "Sin descripción."}
				</p>
			</header>

			<EquipmentTypeInfoCard
				equipmentType={equipmentType}
				timezone={timezone}
			/>

			<Tabs defaultValue="units" className="flex flex-col gap-y-4">
				<div className="flex items-center justify-between gap-4 border-b">
					<TabsList
						variant="line"
						className="h-auto justify-start rounded-none border-b-0 bg-transparent p-0"
					>
						<TabsTrigger
							value="units"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:border-t-transparent data-active:border-l-transparent data-active:border-r-transparent data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							Unidades
						</TabsTrigger>
						<TabsTrigger
							value="accessory-defaults"
							className="gap-2 rounded-none border-b-2 border-transparent px-5 py-3 text-sm font-medium text-muted-foreground shadow-none transition-none focus-visible:ring-0 [&::after]:hidden data-active:border-b-primary data-active:border-t-transparent data-active:border-l-transparent data-active:border-r-transparent data-active:bg-transparent data-active:font-semibold data-active:text-primary data-active:shadow-none"
						>
							Accesorios sugeridos
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent value="units" className="mt-0">
					<EquipmentUnitsTable equipmentType={equipmentType} />
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
	timezone,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
	timezone: string;
}) {
	return (
		<section className="overflow-hidden rounded-lg border bg-background shadow-sm">
			<div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
				<InfoItem label="ID" value={equipmentType.id} />
				<InfoItem
					label="Unidades"
					value={String(equipmentType.assets.length)}
				/>
				<InfoItem
					label="Accesorios sugeridos"
					value={String(equipmentType.accessoryDefaults.length)}
				/>
				<InfoItem
					label="Categoría"
					value={equipmentType.categoryId ?? "Sin categoría"}
				/>
			</div>
			<div className="grid divide-y border-t sm:grid-cols-2 sm:divide-x sm:divide-y-0">
				<InfoItem
					label="Creado"
					value={formatTimestampInTimezone(
						equipmentType.createdAt,
						timezone,
						"DD MMM, YYYY · HH:mm",
					)}
				/>
				<InfoItem
					label="Actualizado"
					value={formatTimestampInTimezone(
						equipmentType.updatedAt,
						timezone,
						"DD MMM, YYYY · HH:mm",
					)}
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

function EquipmentUnitsTable({
	equipmentType,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
}) {
	return (
		<DetailTable
			title="Unidades"
			colSpan={5}
			isEmpty={equipmentType.assets.length === 0}
			emptyMessage="No hay unidades para este equipo."
			actions={<AddUnitsDialog equipmentTypeId={equipmentType.id} />}
		>
			<TableHeader>
				<TableRow className="bg-muted/80">
					<TableHead className="pl-4">N° de serie</TableHead>
					<TableHead>Sucursal</TableHead>
					<TableHead>Estado</TableHead>
					<TableHead>Dueño</TableHead>
					<TableHead>Última actualización</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{equipmentType.assets.map((unit) => (
					<TableRow key={unit.id}>
						<TableCell className="font-medium pl-4">
							{unit.serialNumber ?? "-"}
						</TableCell>
						<TableCell>{unit.branchName ?? unit.branchId}</TableCell>
						<TableCell>
							<EquipmentUnitStatusBadge status={unit.status} />
						</TableCell>
						<TableCell>{unit.ownerName ?? unit.ownerId ?? "—"}</TableCell>
						<TableCell className="text-muted-foreground">
							{formatDateTime(unit.lastUpdate)}
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
			title="Accesorios sugeridos"
			colSpan={3}
			isEmpty={equipmentType.accessoryDefaults.length === 0}
			emptyMessage="No hay accesorios sugeridos definidos."
			actions={<AddAccessorySuggestionsDialog equipmentType={equipmentType} />}
		>
			<TableHeader>
				<TableRow className="bg-muted/80">
					<TableHead className="pl-4">Tipo de equipo accesorio</TableHead>
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

function AddAccessorySuggestionsDialog({
	equipmentType,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
}) {
	const [open, setOpen] = useState(false);
	const formId = useId();
	const { mutateAsync: addAccessorySuggestions, isPending } =
		useAddAccessorySuggestions();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => setOpen(true)}
			>
				Agregar accesorios sugeridos
			</Button>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-4xl">
				<DialogHeader>
					<DialogTitle>Agregar accesorios sugeridos</DialogTitle>
					<DialogDescription>
						Selecciona uno o más tipos de equipo sugeridos para
						{` ${equipmentType.name}`}.
					</DialogDescription>
				</DialogHeader>
				<AddAccessorySuggestionsForm
					key={open ? "open" : "closed"}
					formId={formId}
					equipmentTypeId={equipmentType.id}
					existingAccessoryEquipmentTypeIds={equipmentType.accessoryDefaults.map(
						(accessoryDefault) => accessoryDefault.accessoryEquipmentTypeId,
					)}
					isPending={isPending}
					onCancel={() => setOpen(false)}
					onSubmit={async (values) => {
						await addAccessorySuggestions({
							equipmentTypeId: equipmentType.id,
							body: toAddAccessorySuggestionsDto(values),
						});
						setOpen(false);
					}}
				/>
			</DialogContent>
		</Dialog>
	);
}

function AddUnitsDialog({ equipmentTypeId }: { equipmentTypeId: string }) {
	const [open, setOpen] = useState(false);
	const formId = useId();
	const { data: branches = [] } = useBranches({ isActive: true });
	const { data: owners = [] } = useOwnerOptions();
	const { mutateAsync: addUnitsToEquipmentType, isPending } =
		useAddUnitsToEquipmentType();

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<Button
				type="button"
				size="sm"
				variant="outline"
				onClick={() => setOpen(true)}
			>
				Agregar unit
			</Button>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Agregar unidads</DialogTitle>
					<DialogDescription>
						Carga una o más unidades físicas para este tipo de equipo.
					</DialogDescription>
				</DialogHeader>
				<AddUnitsForm
					key={open ? "open" : "closed"}
					formId={formId}
					branches={branches}
					owners={owners}
					isPending={isPending}
					onCancel={() => setOpen(false)}
					onSubmit={async (values) => {
						await addUnitsToEquipmentType({
							equipmentTypeId,
							body: toAddUnitsToEquipmentTypeDto(values),
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

function EquipmentUnitStatusBadge({
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
