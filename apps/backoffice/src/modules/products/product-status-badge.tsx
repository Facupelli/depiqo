import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import { Badge } from "@repo/ui/components/badge";

export function ProductStatusBadge({
	status,
}: {
	status: GetRentableItemsItemDto["status"];
}) {
	if (status === "ACTIVE") {
		return <Badge className="bg-emerald-600 text-white">Activo</Badge>;
	}
	if (status === "DRAFT") return <Badge variant="secondary">Borrador</Badge>;
	return <Badge variant="outline">Archivado</Badge>;
}
