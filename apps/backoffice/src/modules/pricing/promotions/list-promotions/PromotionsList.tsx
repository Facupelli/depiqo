import type { GetPromotionsPromotionDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
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
}: PromotionsListProps) {
	const columns = createColumns({ onDelete, onEdit });
	const table = useReactTable({
		data: promotions,
		columns,
		getCoreRowModel: getCoreRowModel(),
	});

	return (
		<div className="overflow-hidden rounded-lg border bg-background">
			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id} className="bg-muted/40">
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
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
					{table.getRowModel().rows.map((row) => (
						<TableRow key={row.id} className="hover:bg-muted/50">
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id} className="py-2.5">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
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
				<span className="font-medium text-foreground">{row.original.name}</span>
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
			cell: ({ row }) => (
				<Badge variant="outline">
					{ACTIVATION_LABELS[row.original.activation]}
				</Badge>
			),
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
			cell: ({ row }) => (
				<Badge variant={row.original.isActive ? "default" : "secondary"}>
					{row.original.isActive ? "Activa" : "Inactiva"}
				</Badge>
			),
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
