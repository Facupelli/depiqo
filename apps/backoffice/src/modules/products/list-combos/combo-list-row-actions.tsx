import type { GetRentableItemsItemDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { useNavigate } from "@tanstack/react-router";
import { Archive, Eye, MoreHorizontal, Pencil } from "lucide-react";

export function ComboListRowActions({
	item,
	onArchive,
}: {
	item: GetRentableItemsItemDto;
	onArchive: (item: GetRentableItemsItemDto) => void;
}) {
	const navigate = useNavigate();

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						variant="ghost"
						size="icon"
						aria-label={`Acciones para ${item.name}`}
						onClick={(event) => event.stopPropagation()}
					>
						<MoreHorizontal className="size-4" />
					</Button>
				}
			/>
			<DropdownMenuContent
				align="end"
				onClick={(event) => event.stopPropagation()}
			>
				<DropdownMenuItem
					onClick={() =>
						navigate({
							to: "/dashboard/catalog/$rentableItemId",
							params: { rentableItemId: item.id },
						})
					}
				>
					<Eye className="size-4" />
					Ver combo
				</DropdownMenuItem>
				<DropdownMenuItem
					onClick={() =>
						navigate({
							to: "/dashboard/catalog/$rentableItemId/edit",
							params: { rentableItemId: item.id },
						})
					}
				>
					<Pencil className="size-4" />
					Editar combo
				</DropdownMenuItem>
				{item.status !== "ARCHIVED" ? (
					<DropdownMenuItem
						variant="destructive"
						onClick={() => onArchive(item)}
					>
						<Archive className="size-4" />
						Archivar
					</DropdownMenuItem>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
