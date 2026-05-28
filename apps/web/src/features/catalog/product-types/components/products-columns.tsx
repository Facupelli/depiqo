import type { ProductTypeResponse } from "@repo/schemas";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";

const TRACKING_MODE_LABELS: Record<string, string> = {
	SERIALIZED: "Serialized",
	POOLED: "Pooled",
	NONE: "None",
	// Extend as TrackingType enum grows
} as const;

export function formatTrackingType(value: string): string {
	return (
		TRACKING_MODE_LABELS[value] ??
		value
			.toLowerCase()
			.replace(/_/g, " ")
			.replace(/\b\w/g, (c) => c.toUpperCase())
	);
}

export const productColumns: ColumnDef<ProductTypeResponse>[] = [
	{
		id: "name",
		accessorKey: "name",
		header: "Nombre",
		cell: ({ getValue }) => (
			<span className="font-medium text-foreground">{getValue<string>()}</span>
		),
	},
	{
		id: "category",
		accessorKey: "category",
		header: "Categoría",
		cell: ({ row }) => {
			const category = row.original.category;
			return category ? (
				<Badge variant="secondary">{category.name}</Badge>
			) : (
				<span className="text-muted-foreground text-sm">—</span>
			);
		},
	},
	{
		id: "trackingMode",
		accessorKey: "trackingMode",
		header: "Tracking Mode",
		cell: ({ getValue }) => (
			<span className="text-sm">{formatTrackingType(getValue<string>())}</span>
		),
	},
	{
		id: "status",
		accessorKey: "publishedAt",
		header: "Estado",
		cell: (info) => {
			const publishedAt = info.getValue();
			const retiredAt = info.row.original.retiredAt;

			if (!publishedAt && !retiredAt) {
				return (
					<Badge variant="outline" className="text-muted-foreground">
						Draft
					</Badge>
				);
			}

			if (publishedAt && !retiredAt) {
				return (
					<Badge
						variant="outline"
						className="border-emerald-200 bg-emerald-50 text-emerald-700"
					>
						Active
					</Badge>
				);
			}

			if (publishedAt && retiredAt) {
				return (
					<Badge
						variant="outline"
						className="border-amber-200 bg-amber-50 text-amber-700"
					>
						Retired
					</Badge>
				);
			}

			// Fallback (retired but not published - edge case)
			return (
				<Badge variant="outline" className="text-muted-foreground">
					Inactive
				</Badge>
			);
		},
	},
	{
		accessorKey: "assetCount",
		header: "Total de Assets",
		cell: ({ getValue }) => (
			<span className="tabular-nums text-sm">{getValue<number>()}</span>
		),
	},
];
