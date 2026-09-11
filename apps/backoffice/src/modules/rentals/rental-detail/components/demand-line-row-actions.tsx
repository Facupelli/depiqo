import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { MoreHorizontal, RefreshCw } from "lucide-react";

interface ReplaceableAssignedAsset {
	assetId: string;
	label: string;
}

interface DemandLineRowActionsProps {
	equipmentTypeName: string;
	rentalDemandLineId: string;
	replaceableAssignedAssets: ReplaceableAssignedAsset[];
	onAssignAccessories?: (rentalDemandLineId: string) => void;
	onReplaceAssignedAsset?: (assetId: string) => void;
}

export function DemandLineRowActions({
	equipmentTypeName,
	rentalDemandLineId,
	replaceableAssignedAssets,
	onAssignAccessories,
	onReplaceAssignedAsset,
}: DemandLineRowActionsProps) {
	const soleReplaceableAsset =
		replaceableAssignedAssets.length === 1
			? replaceableAssignedAssets[0]
			: undefined;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="size-6 text-neutral-500"
						aria-label={`Acciones para ${equipmentTypeName}`}
					>
						<MoreHorizontal className="size-3.5" />
					</Button>
				}
			/>
			<DropdownMenuContent align="end" className="min-w-44">
				{onAssignAccessories ? (
					<DropdownMenuItem
						className="whitespace-nowrap"
						onClick={() => onAssignAccessories(rentalDemandLineId)}
					>
						Asignar accesorios
					</DropdownMenuItem>
				) : null}
				{onReplaceAssignedAsset && soleReplaceableAsset ? (
					<DropdownMenuItem
						className="whitespace-nowrap"
						onClick={() => onReplaceAssignedAsset(soleReplaceableAsset.assetId)}
					>
						<RefreshCw className="size-4" />
						Reemplazar unidad
					</DropdownMenuItem>
				) : null}
				{onReplaceAssignedAsset && replaceableAssignedAssets.length > 1 ? (
					<DropdownMenuSub>
						<DropdownMenuSubTrigger className="whitespace-nowrap">
							<RefreshCw className="size-4" />
							Reemplazar unidad
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent className="min-w-40">
							{replaceableAssignedAssets.map((asset) => (
								<DropdownMenuItem
									key={asset.assetId}
									className="whitespace-nowrap"
									onClick={() => onReplaceAssignedAsset(asset.assetId)}
								>
									{asset.label}
								</DropdownMenuItem>
							))}
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				) : null}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
