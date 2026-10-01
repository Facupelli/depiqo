import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";

export function ProductStatusBadge({
	archivedAt,
}: {
	archivedAt: GetRentableItemsItemDto["archivedAt"];
}) {
	return archivedAt === null ? null : (
		<Badge variant="outline">Archivado</Badge>
	);
}
