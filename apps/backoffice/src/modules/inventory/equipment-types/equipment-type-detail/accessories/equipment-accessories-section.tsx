import type { GetEquipmentTypeAccessoryDefaultsItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { Link } from "@tanstack/react-router";
import { Loader2, PackageOpen, Pencil } from "lucide-react";
import { useState } from "react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { EditEquipmentAccessoriesEditor } from "./edit-equipment-accessories-editor";
import { useEquipmentTypeAccessoryDefaults } from "./equipment-type-accessory-defaults.queries";

export function EquipmentAccessoriesSection({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const accessoriesQuery = useEquipmentTypeAccessoryDefaults(equipmentTypeId);
	const accessories = accessoriesQuery.data;

	return (
		<section className="@container/equipment-accessories space-y-4">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h2 className="font-semibold text-lg">Accesorios</h2>
					<p className="mt-1 text-muted-foreground text-sm">
						Configura los accesorios que normalmente se preparan con este
						equipo.
					</p>
				</div>
				{!isEditing && accessories && accessories.length > 0 ? (
					<Button variant="outline" onClick={() => setIsEditing(true)}>
						<Pencil className="mr-2 size-4" />
						Gestionar accesorios
					</Button>
				) : null}
			</div>

			{accessoriesQuery.isError && accessories ? (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm"
				>
					<span>No pudimos actualizar los accesorios.</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => accessoriesQuery.refetch()}
					>
						Reintentar
					</Button>
				</div>
			) : null}

			{accessoriesQuery.isError && !accessories ? (
				<div className="rounded-lg border px-4 py-12 text-center">
					<p className="mb-4 text-destructive text-sm">
						No pudimos cargar los accesorios.
					</p>
					<Button variant="outline" onClick={() => accessoriesQuery.refetch()}>
						Intentar nuevamente
					</Button>
				</div>
			) : isEditing && accessories ? (
				<EditEquipmentAccessoriesEditor
					key={equipmentTypeId}
					equipmentTypeId={equipmentTypeId}
					accessoryDefaults={accessories}
					onCancel={() => setIsEditing(false)}
					onSaved={() => setIsEditing(false)}
				/>
			) : (
				<AccessoryCollection
					items={accessories ?? []}
					isLoading={accessoriesQuery.isPending}
					isRefreshing={accessoriesQuery.isFetching && Boolean(accessories)}
					onConfigure={() => setIsEditing(true)}
				/>
			)}
		</section>
	);
}

function AccessoryCollection({
	items,
	isLoading,
	isRefreshing,
	onConfigure,
}: {
	items: GetEquipmentTypeAccessoryDefaultsItemDto[];
	isLoading: boolean;
	isRefreshing: boolean;
	onConfigure: () => void;
}) {
	const empty = (
		<div className="flex flex-col items-center gap-4 px-4 py-12 text-center text-muted-foreground text-sm">
			<p>Este equipo todavía no tiene accesorios configurados.</p>
			<Button onClick={onConfigure}>Configurar accesorios</Button>
		</div>
	);

	return (
		<div className="space-y-2">
			<div className="flex min-h-5 justify-end">
				<span
					className={
						isRefreshing
							? "flex items-center gap-1.5 text-muted-foreground text-xs"
							: "invisible flex items-center gap-1.5 text-xs"
					}
				>
					<Loader2 className="size-3 animate-spin" />
					Actualizando...
				</span>
			</div>
			<div className="hidden overflow-hidden rounded-lg border @2xl/equipment-accessories:block">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/40">
							<TableHead>Accesorio</TableHead>
							<TableHead className="w-48">Cantidad sugerida</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<DesktopSkeleton />
						) : items.length > 0 ? (
							items.map((item) => (
								<TableRow key={item.accessoryEquipmentTypeId}>
									<TableCell>
										<AccessoryIdentity item={item} />
									</TableCell>
									<TableCell>{item.defaultQuantity}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={2}>{empty}</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="@2xl/equipment-accessories:hidden">
				{isLoading ? (
					<CompactSkeleton />
				) : items.length > 0 ? (
					<ul className="divide-y rounded-lg border">
						{items.map((item) => (
							<li
								key={item.accessoryEquipmentTypeId}
								className="space-y-3 px-4 py-4"
							>
								<AccessoryIdentity item={item} />
								<p className="text-sm">
									<span className="text-muted-foreground">
										Cantidad sugerida:{" "}
									</span>
									{item.defaultQuantity}
								</p>
							</li>
						))}
					</ul>
				) : (
					<div className="rounded-lg border">{empty}</div>
				)}
			</div>
		</div>
	);
}

function AccessoryIdentity({
	item,
}: {
	item: GetEquipmentTypeAccessoryDefaultsItemDto;
}) {
	const imageUrl = buildR2PublicUrl(item.imageUrl, "catalog");

	return (
		<div className="flex min-w-0 items-center gap-3">
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={item.name}
					className="size-12 shrink-0 rounded-lg border object-cover"
				/>
			) : (
				<div className="flex size-12 shrink-0 items-center justify-center rounded-lg border bg-muted text-muted-foreground">
					<PackageOpen className="size-5" />
				</div>
			)}
			<div className="min-w-0">
				<Link
					to="/dashboard/inventory/equipment-types/$equipmentTypeId"
					params={{ equipmentTypeId: item.accessoryEquipmentTypeId }}
					preload={false}
					className="block truncate rounded-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
					{item.name}
				</Link>
				{item.categoryName ? (
					<p className="truncate text-muted-foreground text-xs">
						{item.categoryName}
					</p>
				) : null}
			</div>
		</div>
	);
}

function DesktopSkeleton() {
	return Array.from({ length: 4 }).map((_, index) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
		<TableRow key={index}>
			<TableCell>
				<Skeleton className="h-12 w-full" />
			</TableCell>
			<TableCell>
				<Skeleton className="h-5 w-12" />
			</TableCell>
		</TableRow>
	));
}

function CompactSkeleton() {
	return (
		<ul className="divide-y rounded-lg border">
			{Array.from({ length: 4 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<li key={index} className="flex items-center gap-3 px-4 py-4">
					<Skeleton className="size-12 shrink-0" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-1/2" />
						<Skeleton className="h-3 w-1/3" />
					</div>
				</li>
			))}
		</ul>
	);
}
