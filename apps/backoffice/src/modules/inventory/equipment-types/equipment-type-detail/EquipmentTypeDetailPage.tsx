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
import { useSuspenseQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Box, MapPin, PackageOpen, Pencil, ShoppingBag } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { EditAssetDialog } from "@/modules/inventory/assets/edit-asset/edit-asset-dialog";
import { useRetireAsset } from "@/modules/inventory/assets/retire-asset/retire-asset.mutation";
import { RetireAssetAlertDialog } from "@/modules/inventory/assets/retire-asset/retire-asset-alert-dialog";
import { useOwnerOptions } from "@/modules/inventory/ownership/owner-options.queries";
import { useBranches } from "@/modules/settings/branches/public";
import { ProblemDetailsError } from "@/shared/errors";
import { AddAccessorySuggestionsForm } from "../accessory-suggestions/AddAccessorySuggestionsForm";
import { useAddAccessorySuggestions } from "../accessory-suggestions/add-accessory-suggestions.mutation";
import { toAddAccessorySuggestionsDto } from "../accessory-suggestions/add-accessory-suggestions.schema";
import { AddUnitsForm } from "../add-units/AddUnitsForm";
import { useAddUnitsToEquipmentType } from "../add-units/add-units.mutation";
import { toAddUnitsToEquipmentTypeDto } from "../add-units/add-units.schema";
import { EditEquipmentTypeDialog } from "../edit-equipment-type/edit-equipment-type-dialog";
import { equipmentTypeProductUsageQueries } from "../product-usages/equipment-type-product-usages.queries";
import { equipmentTypeDetailQueries } from "./equipment-type-detail.queries";
import { UnitRowActionsMenu } from "./unit-row-actions-menu";

export function EquipmentTypeDetailPage({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	const { data: equipmentType } = useSuspenseQuery(
		equipmentTypeDetailQueries.detail(equipmentTypeId),
	);
	const { data: productUsages } = useSuspenseQuery(
		equipmentTypeProductUsageQueries.list([equipmentTypeId]),
	);
	const products = productUsages[0]?.products ?? [];
	const branchCount = new Set(
		equipmentType.assets.map((asset) => asset.branchId),
	).size;
	const imageUrl = buildR2PublicUrl(equipmentType.imageUrl, "catalog");

	return (
		<div className="px-6 pb-8">
			<PageBreadcrumb
				parent={{
					label: "Inventario",
					to: "/dashboard/inventory/equipment-types",
				}}
				current={`Equipo / ${equipmentType.name}`}
			/>

			<div className="space-y-5">
				<EquipmentTypeHeader
					equipmentType={equipmentType}
					imageUrl={imageUrl}
				/>

				<div className="grid gap-4 sm:grid-cols-3">
					<OverviewMetric
						icon={Box}
						label="Unidades"
						value={equipmentType.assets.length}
					/>
					<OverviewMetric
						icon={MapPin}
						label="Ubicaciones"
						value={branchCount}
						description="sucursal"
					/>
					<OverviewMetric
						icon={ShoppingBag}
						label="Usado por"
						value={products.length}
						description="productos"
					/>
				</div>

				<div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
					<EquipmentUnitsTable equipmentType={equipmentType} />
					<div className="space-y-5">
						<ProductUsageList products={products} />
						<AccessoryDefaultsTable equipmentType={equipmentType} />
					</div>
				</div>
			</div>
		</div>
	);
}

function EquipmentTypeHeader({
	equipmentType,
	imageUrl,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
	imageUrl: string | null;
}) {
	const [editOpen, setEditOpen] = useState(false);

	return (
		<section className="flex items-start gap-5">
			<div className="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/20 sm:size-32">
				{imageUrl ? (
					<img
						src={imageUrl}
						alt={equipmentType.name}
						className="size-full object-contain p-2"
					/>
				) : (
					<PackageOpen className="size-10 text-muted-foreground" />
				)}
			</div>
			<div className="min-w-0 flex-1 py-2">
				<h1 className="truncate text-3xl font-semibold tracking-tight">
					{equipmentType.name}
				</h1>
				<p className="pt-2 text-blue-600 text-sm">
					{equipmentType.categoryName ?? "Sin categoría"}
				</p>
				{equipmentType.description ? (
					<p className="mt-2 text-muted-foreground text-sm">
						{equipmentType.description}
					</p>
				) : null}
			</div>
			<div className="py-2">
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={() => setEditOpen(true)}
				>
					<Pencil className="mr-2 h-4 w-4" />
					Editar
				</Button>
			</div>
			<EditEquipmentTypeDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				equipmentType={equipmentType}
			/>
		</section>
	);
}

function OverviewMetric({
	icon: Icon,
	label,
	value,
	description,
}: {
	icon: typeof Box;
	label: string;
	value: number;
	description?: string;
}) {
	return (
		<section className="rounded-xl border bg-card p-5 shadow-xs flex gap-4 items-center">
			<div className="flex items-center p-3 bg-blue-100 rounded-md">
				<Icon className="size-6 text-blue-700" />
			</div>
			<div>
				<h2 className="font-medium text-sm">{label}</h2>
				<p className="font-semibold text-2xl tracking-tight">
					{value}{" "}
					{description && (
						<span className="font-normal text-base">{description}</span>
					)}
				</p>
			</div>
		</section>
	);
}

type EquipmentUnit = GetEquipmentTypeDetailResponseDto["assets"][number];

function EquipmentUnitsTable({
	equipmentType,
}: {
	equipmentType: GetEquipmentTypeDetailResponseDto;
}) {
	const [editingUnit, setEditingUnit] = useState<EquipmentUnit | null>(null);
	const [retiringUnit, setRetiringUnit] = useState<EquipmentUnit | null>(null);
	const [retireErrorMessage, setRetireErrorMessage] = useState<string | null>(
		null,
	);
	const { mutateAsync: retireAsset, isPending: isRetiring } = useRetireAsset();

	async function handleRetireConfirm() {
		if (!retiringUnit) {
			return;
		}

		try {
			setRetireErrorMessage(null);
			await retireAsset({
				equipmentTypeId: equipmentType.id,
				assetId: retiringUnit.id,
			});
			setRetiringUnit(null);
		} catch (error) {
			if (error instanceof ProblemDetailsError) {
				setRetireErrorMessage(
					error.problemDetails.detail ?? error.problemDetails.title,
				);
			} else {
				setRetireErrorMessage("No se pudo marcar la unidad como retirada.");
			}
		}
	}

	return (
		<>
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
						<TableHead className="w-12" />
					</TableRow>
				</TableHeader>
				<TableBody>
					{equipmentType.assets.map((unit) => (
						<TableRow key={unit.id}>
							<TableCell className="pl-4">
								<div className="min-w-0">
									<p className="font-medium">{unit.serialNumber ?? "-"}</p>
									{unit.notes ? (
										<p
											className="max-w-56 truncate text-muted-foreground text-xs"
											title={unit.notes}
										>
											{unit.notes}
										</p>
									) : null}
								</div>
							</TableCell>
							<TableCell>{unit.branchName ?? unit.branchId}</TableCell>
							<TableCell>
								<EquipmentUnitStatusBadge status={unit.status} />
							</TableCell>
							<TableCell>{unit.ownerName ?? unit.ownerId ?? "-"}</TableCell>
							<TableCell>
								<UnitRowActionsMenu
									unit={unit}
									onEdit={setEditingUnit}
									onRetire={(target) => {
										setRetireErrorMessage(null);
										setRetiringUnit(target);
									}}
								/>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</DetailTable>

			{editingUnit ? (
				<EditAssetDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setEditingUnit(null);
						}
					}}
					equipmentTypeId={equipmentType.id}
					unit={editingUnit}
				/>
			) : null}

			{retiringUnit ? (
				<RetireAssetAlertDialog
					open
					onOpenChange={(open) => {
						if (!open) {
							setRetiringUnit(null);
						}
					}}
					unit={retiringUnit}
					isPending={isRetiring}
					errorMessage={retireErrorMessage}
					onConfirm={handleRetireConfirm}
				/>
			) : null}
		</>
	);
}

function ProductUsageList({
	products,
}: {
	products: Array<{
		rentableItemId: string;
		name: string;
		quantityPerItem: number;
	}>;
}) {
	return (
		<section className="overflow-hidden rounded-lg border bg-background shadow-sm">
			<div className="px-4 py-3">
				<h2 className="font-semibold text-base tracking-tight">
					Usado por productos
				</h2>
			</div>
			<div className="px-4 pb-4">
				{products.length === 0 ? (
					<p className="p-4 text-muted-foreground text-sm">
						Este equipo no se usa en ningún producto.
					</p>
				) : (
					<ul className="divide-y border rounded-md">
						{products.map((product) => (
							<li
								key={product.rentableItemId}
								className="flex items-center justify-between gap-4 px-4 py-3"
							>
								<Link
									to="/dashboard/catalog/$rentableItemId"
									params={{ rentableItemId: product.rentableItemId }}
									className="min-w-0 truncate rounded-sm text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
								>
									{product.name}
								</Link>
								<span className="shrink-0 text-muted-foreground text-sm">
									x{product.quantityPerItem}
								</span>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
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
			colSpan={2}
			isEmpty={equipmentType.accessoryDefaults.length === 0}
			emptyMessage="No hay accesorios sugeridos definidos."
			footer={<AddAccessorySuggestionsDialog equipmentType={equipmentType} />}
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
				variant="link"
				size="sm"
				className="h-auto px-0 text-blue-700"
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
				Agregar unidad
			</Button>
			<DialogContent className="max-h-[calc(100vh-2rem)] overflow-y-auto sm:max-w-5xl">
				<DialogHeader>
					<DialogTitle>Agregar unidades</DialogTitle>
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
	footer,
}: {
	children: ReactNode;
	colSpan: number;
	isEmpty: boolean;
	emptyMessage: string;
	title: string;
	actions?: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<section className="overflow-hidden rounded-lg border bg-background shadow-sm">
			<div className="flex items-start justify-between gap-4 border-b px-4 py-3">
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
			{footer ? <div className="border-t px-4 py-3">{footer}</div> : null}
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
