import type { CategoryDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@repo/ui/components/table";
import { formatTimestampInTimezone } from "@/lib/dates/format";

interface CategoriesTableProps {
	categories: CategoryDto[];
	isLoading?: boolean;
	timezone: string;
}

export function CategoriesTable({
	categories,
	isLoading = false,
	timezone,
}: CategoriesTableProps) {
	const skeletonRowKeys = [
		"category-loading-row-1",
		"category-loading-row-2",
		"category-loading-row-3",
		"category-loading-row-4",
		"category-loading-row-5",
	];
	const skeletonCellKeys = ["name", "slug", "sortOrder", "status", "createdAt"];

	return (
		<div className="overflow-hidden rounded-lg border bg-background shadow-sm">
			<Table>
				<TableHeader>
					<TableRow className="bg-muted/40">
						<TableHead>Nombre</TableHead>
						<TableHead>Slug</TableHead>
						<TableHead>Orden</TableHead>
						<TableHead>Estado</TableHead>
						<TableHead>Creada</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{isLoading ? (
						skeletonRowKeys.map((rowKey) => (
							<TableRow key={rowKey}>
								{skeletonCellKeys.map((cellKey) => (
									<TableCell key={`${rowKey}-${cellKey}`}>
										<div className="h-4 w-full animate-pulse rounded bg-muted" />
									</TableCell>
								))}
							</TableRow>
						))
					) : categories.length > 0 ? (
						categories.map((category) => (
							<TableRow key={category.id}>
								<TableCell className="font-medium">{category.name}</TableCell>
								<TableCell className="font-mono text-muted-foreground text-xs">
									{category.slug}
								</TableCell>
								<TableCell>{category.sortOrder}</TableCell>
								<TableCell>
									<CategoryStatusBadge isActive={category.isActive} />
								</TableCell>
								<TableCell>
									{formatTimestampInTimezone(
										category.createdAt,
										timezone,
										"DD MMM, YYYY · HH:mm",
									)}
								</TableCell>
							</TableRow>
						))
					) : (
						<TableRow>
							<TableCell
								colSpan={5}
								className="h-24 text-center text-muted-foreground"
							>
								No hay categorías todavía.
							</TableCell>
						</TableRow>
					)}
				</TableBody>
			</Table>
		</div>
	);
}

function CategoryStatusBadge({ isActive }: { isActive: boolean }) {
	if (isActive) {
		return <Badge className="bg-emerald-600 text-white">Activa</Badge>;
	}

	return <Badge variant="secondary">Inactiva</Badge>;
}
