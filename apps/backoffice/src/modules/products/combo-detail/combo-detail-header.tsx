import type { GetRentableItemDetailResponseDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Link, useNavigate } from "@tanstack/react-router";
import { Archive, Ellipsis, PackageOpen, Pencil } from "lucide-react";
import { useState } from "react";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { ArchiveProductAction } from "../archive-product/ArchiveProductAction";
import { ProductStatusBadge } from "../product-status-badge";

export function ComboDetailHeader({
	combo,
}: {
	combo: GetRentableItemDetailResponseDto;
}) {
	const [archiveOpen, setArchiveOpen] = useState(false);
	const navigate = useNavigate();
	const imageUrl = buildR2PublicUrl(combo.imageUrl, "catalog");
	return (
		<header className="border-b border-neutral-200 pb-6">
			<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
				<div className="flex min-w-0 items-center gap-4">
					<div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-muted/20 sm:size-24">
						{imageUrl ? (
							<img
								src={imageUrl}
								alt={combo.name}
								className="size-full object-contain p-2"
							/>
						) : (
							<PackageOpen className="size-9 text-muted-foreground" />
						)}
					</div>
					<div className="min-w-0">
						<h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
							{combo.name}
						</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{combo.categoryName ?? "Sin categoría"}
						</p>
						<div className="mt-2">
							<ProductStatusBadge status={combo.status} />
						</div>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-2 self-start">
					{combo.status !== "ARCHIVED" ? (
						<Button
							render={
								<Link
									to="/dashboard/catalog/packages/$rentableItemId/edit"
									params={{ rentableItemId: combo.id }}
								/>
							}
						>
							<Pencil className="mr-2 size-4" />
							Editar combo
						</Button>
					) : null}
					{combo.status !== "ARCHIVED" ? (
						<DropdownMenu>
							<DropdownMenuTrigger
								render={
									<Button
										variant="outline"
										size="icon"
										aria-label="Abrir acciones del combo"
									>
										<Ellipsis className="size-4" />
									</Button>
								}
							/>
							<DropdownMenuContent align="end">
								<DropdownMenuItem
									variant="destructive"
									onClick={() => setArchiveOpen(true)}
								>
									<Archive className="size-4" />
									Archivar
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					) : null}
				</div>
			</div>
			<ArchiveProductAction
				rentableItemId={combo.id}
				terminology="combo"
				open={archiveOpen}
				onOpenChange={setArchiveOpen}
				onSuccess={() => navigate({ to: "/dashboard/catalog/packages" })}
			/>
		</header>
	);
}
