import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Ellipsis, PackageOpen, PackagePlus, Pencil } from "lucide-react";

type EquipmentTypeHeaderProps = {
	name: string;
	imageUrl: string | null;
	categoryName: string | null;
	activeAssetCount: number;
	onEdit: () => void;
	onAddUnit: () => void;
};

export function EquipmentTypeHeader({
	name,
	imageUrl,
	categoryName,
	activeAssetCount,
	onEdit,
	onAddUnit,
}: EquipmentTypeHeaderProps) {
	return (
		<header className="border-b border-neutral-200 pb-6">
			<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/20 sm:size-24">
						{imageUrl ? (
							<img
								src={imageUrl}
								alt={name}
								className="size-full object-contain p-2"
							/>
						) : (
							<PackageOpen className="size-9 text-muted-foreground" />
						)}
					</div>
					<div className="min-w-0">
						<h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
							{name}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{categoryName ?? "Sin categoría"}
						</p>
						<p className="mt-1 text-sm text-neutral-500">
							{activeAssetCount}{" "}
							{activeAssetCount === 1 ? "unidad activa" : "unidades activas"}
						</p>
					</div>
				</div>

				<div className="flex shrink-0 items-center gap-2 self-start">
					<Button type="button" onClick={onEdit}>
						<Pencil className="mr-2 size-4" />
						Editar equipo
					</Button>
					<DropdownMenu>
						<DropdownMenuTrigger
							render={
								<Button
									type="button"
									variant="outline"
									size="icon"
									aria-label="Abrir acciones del equipo"
								>
									<Ellipsis className="size-4" />
								</Button>
							}
						/>
						<DropdownMenuContent align="end" className="min-w-fit">
							<DropdownMenuItem onClick={onAddUnit}>
								<PackagePlus className="size-4" />
								Añadir unidad
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			</div>
		</header>
	);
}
