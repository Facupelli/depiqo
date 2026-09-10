import type { GetPromotionsPromotionDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
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
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	useReactTable,
} from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

interface PromotionsListProps {
	promotions: GetPromotionsPromotionDto[];
	onEdit: (promotion: GetPromotionsPromotionDto) => void;
	onDelete?: (promotion: GetPromotionsPromotionDto) => void;
	isLoading?: boolean;
	isError?: boolean;
}

const ACTIVATION_LABELS: Record<
	GetPromotionsPromotionDto["activation"],
	string
> = {
	AUTOMATIC: "Automática",
	COUPON_REQUIRED: "Con cupón",
};

export function PromotionsList({
	promotions,
	onDelete,
	onEdit,
	isLoading = false,
	isError = false,
}: PromotionsListProps) {
	const columns = createColumns({ onDelete, onEdit });
	const table = useReactTable({
		data: promotions,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<>
			<div className="hidden overflow-hidden rounded-lg border bg-card @2xl/promotions-index:block">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id} className="bg-muted/40">
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={getResponsiveColumnClass(header.column.id)}
									>
										{header.isPlaceholder
											? null
											: flexRender(
													header.column.columnDef.header,
													header.getContext(),
												)}
									</TableHead>
								))}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableSkeletonRows
								columnIds={table.getAllLeafColumns().map((column) => column.id)}
							/>
						) : isError || table.getRowModel().rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className={`h-32 text-center text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
								>
									{isError
										? "No se pudieron cargar las promociones."
										: "No se encontraron promociones."}
								</TableCell>
							</TableRow>
						) : (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} className="hover:bg-muted/50">
									{row.getVisibleCells().map((cell) => (
										<TableCell
											key={cell.id}
											className={`py-2.5 ${getResponsiveColumnClass(cell.column.id) ?? ""}`}
										>
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext(),
											)}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			<CompactPromotionsList
				promotions={promotions}
				onDelete={onDelete}
				onEdit={onEdit}
				isLoading={isLoading}
				isError={isError}
			/>
		</>
	);
}

function getResponsiveColumnClass(columnId: string): string | undefined {
	if (["activation", "priority"].includes(columnId)) {
		return "hidden @5xl/promotions-index:table-cell";
	}
	return undefined;
}

function TableSkeletonRows({ columnIds }: { columnIds: string[] }) {
	return Array.from({ length: 5 }).map((_, rowIndex) => (
		// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
		<TableRow key={rowIndex}>
			{columnIds.map((columnId) => (
				<TableCell
					key={columnId}
					className={getResponsiveColumnClass(columnId)}
				>
					<Skeleton className="h-4 w-full" />
				</TableCell>
			))}
		</TableRow>
	));
}

function CompactPromotionsList({
	promotions,
	onDelete,
	onEdit,
	isLoading,
	isError = false,
}: PromotionsListProps & { isLoading: boolean }) {
	return (
		<div className="@2xl/promotions-index:hidden">
			{isLoading ? (
				<CompactSkeletonRows />
			) : isError || promotions.length === 0 ? (
				<div
					className={`border-y px-4 py-12 text-center text-sm ${isError ? "text-destructive" : "text-muted-foreground"}`}
				>
					{isError
						? "No se pudieron cargar las promociones."
						: "No se encontraron promociones."}
				</div>
			) : (
				<ul className="divide-y border-y">
					{promotions.map((promotion) => (
						<li key={promotion.id} className="px-3 py-3">
							<div className="flex min-w-0 items-start gap-3">
								<div className="min-w-0 flex-1 space-y-3">
									<div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
										<p className="min-w-0 break-words font-medium text-foreground">
											{promotion.name}
										</p>
										<PromotionStatusBadge promotion={promotion} />
									</div>
									<div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
										<CompactDetail label="Descuento">
											{formatDiscount(promotion)}
										</CompactDetail>
										<CompactDetail label="Activación">
											<PromotionActivationBadge promotion={promotion} />
										</CompactDetail>
										<CompactDetail label="Vigencia" className="col-span-2">
											{formatValidity(promotion)}
										</CompactDetail>
									</div>
									<p className="text-xs text-muted-foreground tabular-nums">
										Prioridad {promotion.priority}
									</p>
								</div>
								<RowActions
									onEdit={() => onEdit(promotion)}
									onDelete={onDelete ? () => onDelete(promotion) : undefined}
								/>
							</div>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function CompactDetail({
	label,
	children,
	className = "",
}: {
	label: string;
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div className={`min-w-0 space-y-1 ${className}`}>
			<p className="text-xs font-medium text-muted-foreground">{label}</p>
			<div className="break-words text-foreground">{children}</div>
		</div>
	);
}

function CompactSkeletonRows() {
	return (
		<ul className="divide-y border-y" aria-label="Cargando promociones">
			{Array.from({ length: 5 }).map((_, index) => (
				// biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static placeholders.
				<li key={index} className="space-y-3 px-3 py-3">
					<div className="flex items-center justify-between gap-3">
						<Skeleton className="h-5 w-1/2" />
						<Skeleton className="h-5 w-16" />
					</div>
					<div className="grid grid-cols-2 gap-4">
						<Skeleton className="h-10 w-full" />
						<Skeleton className="h-10 w-full" />
					</div>
					<Skeleton className="h-9 w-full" />
				</li>
			))}
		</ul>
	);
}

function createColumns({
	onDelete,
	onEdit,
}: Pick<
	PromotionsListProps,
	"onDelete" | "onEdit"
>): ColumnDef<GetPromotionsPromotionDto>[] {
	return [
		{
			accessorKey: "name",
			header: "Promoción",
			cell: ({ row }) => (
				<div className="min-w-0 space-y-1.5">
					<span className="break-words font-medium text-foreground">
						{row.original.name}
					</span>
					<div className="flex flex-wrap items-center gap-2 @5xl/promotions-index:hidden">
						<PromotionActivationBadge promotion={row.original} />
						<span className="text-xs text-muted-foreground tabular-nums">
							Prioridad {row.original.priority}
						</span>
					</div>
				</div>
			),
		},
		{
			id: "discount",
			header: "Descuento",
			cell: ({ row }) => formatDiscount(row.original),
		},
		{
			accessorKey: "activation",
			header: "Activación",
			cell: ({ row }) => <PromotionActivationBadge promotion={row.original} />,
		},
		{
			id: "validity",
			header: "Vigencia",
			cell: ({ row }) => formatValidity(row.original),
		},
		{
			accessorKey: "priority",
			header: "Prioridad",
			cell: ({ row }) => (
				<span className="tabular-nums">{row.original.priority}</span>
			),
		},
		{
			accessorKey: "isActive",
			header: "Estado",
			cell: ({ row }) => <PromotionStatusBadge promotion={row.original} />,
		},
		{
			id: "actions",
			header: () => <span className="sr-only">Acciones</span>,
			cell: ({ row }) => (
				<div className="flex justify-end">
					<RowActions
						onEdit={() => onEdit(row.original)}
						onDelete={onDelete ? () => onDelete(row.original) : undefined}
					/>
				</div>
			),
		},
	];
}

function PromotionActivationBadge({
	promotion,
}: {
	promotion: GetPromotionsPromotionDto;
}) {
	return (
		<Badge variant="outline">{ACTIVATION_LABELS[promotion.activation]}</Badge>
	);
}

function PromotionStatusBadge({
	promotion,
}: {
	promotion: GetPromotionsPromotionDto;
}) {
	return (
		<Badge variant={promotion.isActive ? "default" : "secondary"}>
			{promotion.isActive ? "Activa" : "Inactiva"}
		</Badge>
	);
}

function RowActions({
	onDelete,
	onEdit,
}: {
	onDelete?: () => void;
	onEdit: () => void;
}) {
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label="Abrir acciones de la promoción"
					>
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				}
			/>

			<DropdownMenuContent align="end" className="w-40">
				<DropdownMenuItem onClick={onEdit}>
					<Pencil className="h-4 w-4" />
					Editar
				</DropdownMenuItem>

				{onDelete ? (
					<DropdownMenuItem variant="destructive" onClick={onDelete}>
						<Trash2 className="h-4 w-4" />
						Eliminar
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function formatDiscount(promotion: GetPromotionsPromotionDto): string {
	const value = formatDecimal(promotion.effectValue);
	return promotion.effectType === "PERCENTAGE_OFF" ? `${value}%` : `$${value}`;
}

function formatValidity(promotion: GetPromotionsPromotionDto): string {
	if (!promotion.validFrom && !promotion.validUntil) {
		return "Vigencia indefinida";
	}

	const from = promotion.validFrom
		? formatLocalDate(promotion.validFrom)
		: "Siempre";
	const until = promotion.validUntil
		? formatLocalDate(promotion.validUntil)
		: "Sin fin";

	return `${from} - ${until}`;
}

function formatLocalDate(value: string): string {
	const [year, month, day] = value.split("-");
	return `${day}/${month}/${year}`;
}

function formatDecimal(value: string): string {
	const number = Number.parseFloat(value);
	if (Number.isNaN(number)) return value;
	if (number === Math.floor(number)) return number.toString();

	return number.toLocaleString("es-ES", {
		minimumFractionDigits: 1,
		maximumFractionDigits: 2,
	});
}
