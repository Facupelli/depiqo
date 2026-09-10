import { Button } from "@repo/ui/components/button";
import { PackageOpen, PackagePlus, Pencil } from "lucide-react";

type EquipmentTypeHeaderProps = {
	name: string;
	imageUrl: string | null;
	categoryName: string | null;
	description: string | null;
	activeAssetCount: number;
	onEdit: () => void;
	onAddUnit: () => void;
};

export function EquipmentTypeHeader({
	name,
	imageUrl,
	categoryName,
	description,
	activeAssetCount,
	onEdit,
	onAddUnit,
}: EquipmentTypeHeaderProps) {
	const visibleDescription = description?.trim();

	return (
		<header className="border-b border-neutral-200 pb-6">
			<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<div
						className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white ${visibleDescription ? "size-24 sm:size-32" : "size-20 sm:size-24"}`}
					>
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
						{visibleDescription ? (
							<p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-neutral-600">
								{visibleDescription}
							</p>
						) : null}
					</div>
				</div>

				<div className="flex shrink-0 flex-wrap items-center gap-2 self-start">
					<Button type="button" onClick={onEdit}>
						<Pencil className="mr-2 size-4" />
						Editar equipo
					</Button>
					<Button type="button" variant="outline" onClick={onAddUnit}>
						<PackagePlus className="mr-2 size-4" />
						Añadir unidad
					</Button>
				</div>
			</div>
		</header>
	);
}
