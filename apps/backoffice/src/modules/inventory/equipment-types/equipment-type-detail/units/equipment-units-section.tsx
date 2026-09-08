import type {
	GetEquipmentTypeAssetsItemDto,
	GetEquipmentTypeAssetsQueryDto,
} from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@repo/ui/components/select";
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
	ChevronLeft,
	ChevronRight,
	Loader2,
	Plus,
	Search,
	X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useDeactivateAsset } from "@/modules/inventory/assets/deactivate-asset/deactivate-asset.mutation";
import { ChangeAssetOwnerDialog } from "@/modules/inventory/assets/change-asset-owner/change-asset-owner-dialog";
import { EditAssetDialog } from "@/modules/inventory/assets/edit-asset/edit-asset-dialog";
import { useReactivateAsset } from "@/modules/inventory/assets/reactivate-asset/reactivate-asset.mutation";
import { RetireAssetAlertDialog } from "@/modules/inventory/assets/retire-asset/retire-asset-alert-dialog";
import { useRetireAsset } from "@/modules/inventory/assets/retire-asset/retire-asset.mutation";
import { useOwnerOptions } from "@/modules/inventory/ownership/public";
import { useBranches } from "@/modules/settings/branches/public";
import useDebounce from "@/shared/hooks/use-debounce";
import { ProblemDetailsError } from "@/shared/errors";
import { UnitRowActionsMenu } from "../unit-row-actions-menu";
import { useEquipmentTypeDetailActions } from "../equipment-type-detail-actions";
import { useEquipmentTypeAssets } from "./equipment-type-assets.queries";

const ALL_VALUE = "all";

type UnitsSearch = GetEquipmentTypeAssetsQueryDto;

type Props = {
	equipmentTypeId: string;
	search: UnitsSearch;
	onSearchChange: (updater: (previous: UnitsSearch) => UnitsSearch) => void;
};

export function EquipmentUnitsSection({
	equipmentTypeId,
	search,
	onSearchChange,
}: Props) {
	const { openAddUnits } = useEquipmentTypeDetailActions();
	const [searchInput, setSearchInput] = useState(search.search ?? "");
	const [editUnit, setEditUnit] =
		useState<GetEquipmentTypeAssetsItemDto | null>(null);
	const [ownerUnit, setOwnerUnit] =
		useState<GetEquipmentTypeAssetsItemDto | null>(null);
	const [retireUnit, setRetireUnit] =
		useState<GetEquipmentTypeAssetsItemDto | null>(null);
	const [pendingLifecycleAssetId, setPendingLifecycleAssetId] = useState<
		string | null
	>(null);
	const [lifecycleError, setLifecycleError] = useState<string | null>(null);
	const [retireError, setRetireError] = useState<string | null>(null);
	const debouncedSearch = useDebounce(searchInput, 300);
	const unitsQuery = useEquipmentTypeAssets(equipmentTypeId, search);
	const branchesQuery = useBranches();
	const ownerOptionsQuery = useOwnerOptions();
	const branches = branchesQuery.data ?? [];
	const owners = ownerOptionsQuery.data ?? [];
	const showBranchFilter =
		!branchesQuery.isSuccess || branchesQuery.data.length !== 1;
	const deactivateMutation = useDeactivateAsset();
	const reactivateMutation = useReactivateAsset();
	const retireMutation = useRetireAsset();
	const hasFilters = Boolean(
		search.search || search.status || search.branchId || search.ownerId,
	);
	const data = unitsQuery.data;
	const totalPages = Math.max(
		1,
		Math.ceil((data?.total ?? 0) / (data?.pageSize ?? search.pageSize)),
	);

	useEffect(() => {
		setSearchInput(search.search ?? "");
	}, [search.search]);

	useEffect(() => {
		const nextSearch = debouncedSearch.trim() || undefined;
		if (nextSearch === search.search) return;
		onSearchChange((previous) => ({
			...previous,
			search: nextSearch,
			page: 1,
		}));
	}, [debouncedSearch, onSearchChange, search.search]);

	useEffect(() => {
		if (!unitsQuery.isSuccess || !data || unitsQuery.isPlaceholderData) return;
		const lastPage = Math.max(1, Math.ceil(data.total / data.pageSize));
		if (search.page > lastPage && search.page > 1) {
			onSearchChange((previous) => ({ ...previous, page: lastPage }));
		}
	}, [
		data,
		onSearchChange,
		search.page,
		unitsQuery.isPlaceholderData,
		unitsQuery.isSuccess,
	]);

	function changeFilters(filters: Partial<UnitsSearch>) {
		onSearchChange((previous) => ({ ...previous, ...filters, page: 1 }));
	}

	function clearFilters() {
		setSearchInput("");
		onSearchChange((previous) => ({ page: 1, pageSize: previous.pageSize }));
	}

	function getLifecycleError(error: unknown): string {
		if (error instanceof ProblemDetailsError) {
			return error.problemDetails.detail ?? error.problemDetails.title;
		}
		return "No pudimos actualizar el estado de la unidad. Intentá de nuevo.";
	}

	async function runLifecycleAction(
		unit: GetEquipmentTypeAssetsItemDto,
		action: "deactivate" | "reactivate",
	) {
		if (pendingLifecycleAssetId === unit.id) return;
		setPendingLifecycleAssetId(unit.id);
		setLifecycleError(null);
		try {
			const variables = { assetId: unit.id, equipmentTypeId };
			if (action === "deactivate")
				await deactivateMutation.mutateAsync(variables);
			else await reactivateMutation.mutateAsync(variables);
		} catch (error) {
			setLifecycleError(getLifecycleError(error));
		} finally {
			setPendingLifecycleAssetId(null);
		}
	}

	async function confirmRetirement() {
		if (!retireUnit || pendingLifecycleAssetId === retireUnit.id) return;
		setPendingLifecycleAssetId(retireUnit.id);
		setRetireError(null);
		try {
			await retireMutation.mutateAsync({
				assetId: retireUnit.id,
				equipmentTypeId,
			});
			setRetireUnit(null);
		} catch (error) {
			setRetireError(getLifecycleError(error));
		} finally {
			setPendingLifecycleAssetId(null);
		}
	}

	const actions = (unit: GetEquipmentTypeAssetsItemDto) => (
		<UnitRowActionsMenu
			unit={unit}
			onEdit={setEditUnit}
			onChangeOwner={setOwnerUnit}
			onDeactivate={(item) => runLifecycleAction(item, "deactivate")}
			onReactivate={(item) => runLifecycleAction(item, "reactivate")}
			onRetire={(item) => {
				setRetireError(null);
				setRetireUnit(item);
			}}
			isLifecyclePending={pendingLifecycleAssetId === unit.id}
		/>
	);

	return (
		<section className="@container/equipment-units space-y-4">
			<div className="rounded-sm border border-border/70 bg-background px-4 py-3 shadow-xs">
				<div
					className={`grid gap-2 @md/equipment-units:grid-cols-2 ${showBranchFilter ? "@4xl/equipment-units:grid-cols-[minmax(240px,1fr)_160px_180px_180px_auto]" : "@4xl/equipment-units:grid-cols-[minmax(240px,1fr)_160px_180px_auto]"} @4xl/equipment-units:items-center`}
				>
					<div className="relative @md/equipment-units:col-span-2 @4xl/equipment-units:col-span-1">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
						<Input
							type="search"
							aria-label="Buscar unidades"
							placeholder="Buscar por referencia o notas"
							value={searchInput}
							className="h-9 pl-9"
							onChange={(event) => setSearchInput(event.target.value)}
						/>
					</div>
					<FilterSelect
						label="Estado"
						value={search.status ?? ALL_VALUE}
						onChange={(value) =>
							changeFilters({
								status:
									value === ALL_VALUE
										? undefined
										: (value as UnitsSearch["status"]),
							})
						}
						items={[
							{ value: ALL_VALUE, label: "Todos" },
							{ value: "ACTIVE", label: "Activa" },
							{ value: "INACTIVE", label: "Inactiva" },
							{ value: "RETIRED", label: "Retirada" },
						]}
					/>
					{showBranchFilter ? (
						<FilterSelect
							label="Sucursal"
							value={search.branchId ?? ALL_VALUE}
							disabled={branchesQuery.isPending || branchesQuery.isError}
							statusLabel={
								branchesQuery.isPending
									? "Cargando..."
									: branchesQuery.isError
										? "Error al cargar"
										: undefined
							}
							onChange={(value) =>
								changeFilters({
									branchId: value === ALL_VALUE ? undefined : value,
								})
							}
							items={[
								{ value: ALL_VALUE, label: "Todas" },
								...branches.map((branch) => ({
									value: branch.id,
									label: branch.name,
								})),
							]}
						/>
					) : null}
					<FilterSelect
						label="Propietario"
						value={search.ownerId ?? ALL_VALUE}
						disabled={ownerOptionsQuery.isPending || ownerOptionsQuery.isError}
						statusLabel={
							ownerOptionsQuery.isPending
								? "Cargando..."
								: ownerOptionsQuery.isError
									? "Error al cargar"
									: undefined
						}
						onChange={(value) =>
							changeFilters({
								ownerId: value === ALL_VALUE ? undefined : value,
							})
						}
						items={[
							{ value: ALL_VALUE, label: "Todos" },
							...owners.map((owner) => ({
								value: owner.id,
								label: owner.name,
							})),
						]}
					/>
					<Button onClick={openAddUnits}>
						<Plus className="mr-2 size-4" />
						Añadir unidad
					</Button>
				</div>
				{hasFilters ? (
					<button
						type="button"
						className="mt-3 inline-flex items-center text-muted-foreground text-xs hover:text-foreground"
						onClick={clearFilters}
					>
						<X className="mr-1 size-3" />
						Limpiar filtros
					</button>
				) : null}
			</div>

			{lifecycleError ? (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm"
				>
					<span>{lifecycleError}</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => setLifecycleError(null)}
					>
						Cerrar
					</Button>
				</div>
			) : null}
			{unitsQuery.isError && data ? (
				<div
					role="alert"
					className="flex items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-destructive text-sm"
				>
					<span>No pudimos actualizar las unidades.</span>
					<Button
						variant="ghost"
						size="sm"
						onClick={() => unitsQuery.refetch()}
					>
						Reintentar
					</Button>
				</div>
			) : null}

			{unitsQuery.isError && !data ? (
				<div className="rounded-lg border px-4 py-12 text-center">
					<p className="mb-4 text-destructive text-sm">
						No pudimos cargar las unidades.
					</p>
					<Button variant="outline" onClick={() => unitsQuery.refetch()}>
						Intentar nuevamente
					</Button>
				</div>
			) : (
				<>
					<UnitCollection
						items={data?.data ?? []}
						isLoading={unitsQuery.isPending}
						isRefreshing={unitsQuery.isFetching && Boolean(data)}
						hasFilters={hasFilters}
						onAdd={openAddUnits}
						onClear={clearFilters}
						actions={actions}
					/>
					{data && data.total > 0 ? (
						<Pagination
							page={search.page}
							pageSize={data.pageSize}
							total={data.total}
							totalPages={totalPages}
							disabled={unitsQuery.isPending}
							onPageChange={(page) =>
								onSearchChange((previous) => ({ ...previous, page }))
							}
						/>
					) : null}
				</>
			)}

			{editUnit ? (
				<EditAssetDialog
					open
					equipmentTypeId={equipmentTypeId}
					unit={editUnit}
					onOpenChange={(open) => {
						if (!open) setEditUnit(null);
					}}
				/>
			) : null}
			{ownerUnit ? (
				<ChangeAssetOwnerDialog
					open
					equipmentTypeId={equipmentTypeId}
					unit={ownerUnit}
					onOpenChange={(open) => {
						if (!open) setOwnerUnit(null);
					}}
				/>
			) : null}
			{retireUnit ? (
				<RetireAssetAlertDialog
					open
					unit={retireUnit}
					isPending={pendingLifecycleAssetId === retireUnit.id}
					errorMessage={retireError}
					onConfirm={confirmRetirement}
					onOpenChange={(open) => {
						if (!open) setRetireUnit(null);
					}}
				/>
			) : null}
		</section>
	);
}

function FilterSelect({
	label,
	value,
	onChange,
	items,
	disabled = false,
	statusLabel,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
	items: { value: string; label: string }[];
	disabled?: boolean;
	statusLabel?: string;
}) {
	return (
		<Select
			value={value}
			items={items}
			disabled={disabled}
			onValueChange={(next) => {
				if (next) onChange(next);
			}}
		>
			<SelectTrigger className="h-9 w-full">
				<span className="mr-1 text-muted-foreground text-xs">{label}</span>
				{statusLabel ? (
					<span className="truncate text-muted-foreground">{statusLabel}</span>
				) : (
					<SelectValue />
				)}
			</SelectTrigger>
			<SelectContent>
				{items.map((item) => (
					<SelectItem key={item.value} value={item.value}>
						{item.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function AssetStatusBadge({
	status,
}: {
	status: GetEquipmentTypeAssetsItemDto["status"];
}) {
	if (status === "ACTIVE")
		return <Badge className="bg-emerald-600 text-white">Activo</Badge>;
	if (status === "INACTIVE") return <Badge variant="secondary">Inactivo</Badge>;
	return <Badge variant="outline">Retirado</Badge>;
}

function UnitCollection({
	items,
	isLoading,
	isRefreshing,
	hasFilters,
	onAdd,
	onClear,
	actions,
}: {
	items: GetEquipmentTypeAssetsItemDto[];
	isLoading: boolean;
	isRefreshing: boolean;
	hasFilters: boolean;
	onAdd: () => void;
	onClear: () => void;
	actions: (unit: GetEquipmentTypeAssetsItemDto) => React.ReactNode;
}) {
	const empty = (
		<div className="flex flex-col items-center gap-4 px-4 py-12 text-center text-muted-foreground text-sm">
			<p>
				{hasFilters
					? "No hay unidades que coincidan con los filtros."
					: "Este equipo todavía no tiene unidades."}
			</p>
			<Button
				variant={hasFilters ? "outline" : "default"}
				onClick={hasFilters ? onClear : onAdd}
			>
				{hasFilters ? "Limpiar filtros" : "Añadir unidad"}
			</Button>
		</div>
	);
	return (
		<div className="space-y-2">
			<div className="flex min-h-5 justify-end">
				<RefreshIndicator show={isRefreshing} />
			</div>
			<div className="hidden overflow-hidden rounded-lg border @2xl/equipment-units:block">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/40">
							<TableHead>Referencia</TableHead>
							<TableHead>Estado</TableHead>
							<TableHead>Sucursal</TableHead>
							<TableHead>Propietario</TableHead>
							<TableHead className="w-16">
								<span className="sr-only">Acciones</span>
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<DesktopSkeleton />
						) : items.length ? (
							items.map((unit) => (
								<TableRow key={unit.id}>
									<TableCell>
										<Reference unit={unit} />
									</TableCell>
									<TableCell>
										<AssetStatusBadge status={unit.status} />
									</TableCell>
									<TableCell>{unit.branchName ?? unit.branchId}</TableCell>
									<TableCell>
										{unit.ownerId === null
											? "Propio"
											: (unit.ownerName ?? unit.ownerId)}
									</TableCell>
									<TableCell>{actions(unit)}</TableCell>
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={5}>{empty}</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>
			<div className="@2xl/equipment-units:hidden">
				{isLoading ? (
					<CompactSkeleton />
				) : items.length ? (
					<ul className="divide-y rounded-lg border">
						{items.map((unit) => (
							<li key={unit.id} className="relative space-y-3 px-4 py-4 pr-12">
								<Reference unit={unit} />
								<div className="flex flex-wrap items-center gap-2">
									<AssetStatusBadge status={unit.status} />
									<span className="text-muted-foreground text-xs">
										{unit.branchName ?? unit.branchId}
									</span>
								</div>
								<p className="text-sm">
									<span className="text-muted-foreground">Propietario: </span>
									{unit.ownerId === null
										? "Propio"
										: (unit.ownerName ?? unit.ownerId)}
								</p>
								<div className="absolute top-2 right-2">{actions(unit)}</div>
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

function Reference({ unit }: { unit: GetEquipmentTypeAssetsItemDto }) {
	return (
		<div className="min-w-0">
			<p className="font-medium">{unit.serialNumber ?? "Sin referencia"}</p>
			{unit.notes ? (
				<p className="mt-1 whitespace-pre-wrap text-muted-foreground text-xs">
					{unit.notes}
				</p>
			) : null}
		</div>
	);
}
function RefreshIndicator({ show }: { show: boolean }) {
	return (
		<span
			className={
				show
					? "flex items-center gap-1.5 text-muted-foreground text-xs"
					: "invisible flex items-center gap-1.5 text-xs"
			}
		>
			<Loader2 className="size-3 animate-spin" />
			Actualizando...
		</span>
	);
}
function DesktopSkeleton() {
	return (
		<>
			{Array.from({ length: 5 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<TableRow key={index}>
					<TableCell colSpan={5}>
						<Skeleton className="h-5 w-full" />
					</TableCell>
				</TableRow>
			))}
		</>
	);
}
function CompactSkeleton() {
	return (
		<ul className="divide-y rounded-lg border">
			{Array.from({ length: 5 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<li key={index} className="space-y-3 px-4 py-4">
					<Skeleton className="h-5 w-1/2" />
					<Skeleton className="h-4 w-3/4" />
					<Skeleton className="h-4 w-2/3" />
				</li>
			))}
		</ul>
	);
}
function Pagination({
	page,
	pageSize,
	total,
	totalPages,
	disabled,
	onPageChange,
}: {
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
	disabled: boolean;
	onPageChange: (page: number) => void;
}) {
	const first = (page - 1) * pageSize + 1;
	const last = Math.min(page * pageSize, total);
	return (
		<div className="flex flex-wrap items-center justify-between gap-3 text-muted-foreground text-sm">
			<span>
				{first}–{last} de {total} unidades
			</span>
			<div className="flex items-center gap-2">
				<Button
					variant="outline"
					size="icon"
					disabled={disabled || page <= 1}
					onClick={() => onPageChange(page - 1)}
				>
					<ChevronLeft className="size-4" />
					<span className="sr-only">Página anterior</span>
				</Button>
				<span className="min-w-24 text-center">
					Página {page} de {totalPages}
				</span>
				<Button
					variant="outline"
					size="icon"
					disabled={disabled || page >= totalPages}
					onClick={() => onPageChange(page + 1)}
				>
					<ChevronRight className="size-4" />
					<span className="sr-only">Página siguiente</span>
				</Button>
			</div>
		</div>
	);
}
