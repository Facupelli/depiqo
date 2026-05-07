import type {
	ProductTypeAccessoryLinkResponse,
	ProductTypeResponse,
} from "@repo/schemas";
import { Plus, Save, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useReplaceProductTypeAccessoryLinks } from "@/features/catalog/product-types/product.mutations";
import { useAvailableProductTypeAccessories } from "@/features/catalog/product-types/products.queries";
import useDebounce from "@/shared/hooks/use-debounce";
import { useProduct } from "./product-detail.context";

type AccessoryLinkDraft = {
	accessoryRentalItemId: string;
	isDefaultIncluded: boolean;
	defaultQuantity: number;
	notes: string;
	accessoryRentalItem: ProductTypeAccessoryLinkResponse["accessoryRentalItem"];
};

interface AccessoriesTabProps {
	isActive: boolean;
	onDirtyChange: (isDirty: boolean) => void;
}

export function AccessoriesTab({ isActive, onDirtyChange }: AccessoriesTabProps) {
	const { product } = useProduct();
	const initialLinks = toDraftLinks(product.accessoryLinks ?? []);
	const [savedLinks, setSavedLinks] =
		useState<AccessoryLinkDraft[]>(initialLinks);
	const [links, setLinks] = useState<AccessoryLinkDraft[]>(initialLinks);
	const [search, setSearch] = useState("");
	const [serverError, setServerError] = useState<string | null>(null);
	const debouncedSearch = useDebounce(search, 300);
	const { mutateAsync: replaceAccessoryLinks, isPending: isSaving } =
		useReplaceProductTypeAccessoryLinks();

	const { data: accessoryResults, isFetching } =
		useAvailableProductTypeAccessories(
			product.id,
			{
				search: debouncedSearch || undefined,
				limit: 10,
			},
			{ enabled: isActive },
		);

	const accessorySearchId = useId();
	const availableAccessories = accessoryResults?.data ?? [];
	const isDirty = !areAccessoryLinksEqual(links, savedLinks);

	function updateLinks(nextLinks: AccessoryLinkDraft[]) {
		setLinks(nextLinks);
		onDirtyChange(!areAccessoryLinksEqual(nextLinks, savedLinks));
	}

	function handleAddAccessory(accessory: ProductTypeResponse) {
		updateLinks([
			...links,
			{
				accessoryRentalItemId: accessory.id,
				isDefaultIncluded: true,
				defaultQuantity: 1,
				notes: "",
				accessoryRentalItem: {
					id: accessory.id,
					name: accessory.name,
					imageUrl: accessory.imageUrl,
					trackingMode: accessory.trackingMode,
					retiredAt: accessory.retiredAt,
				},
			},
		]);
		setSearch("");
	}

	function handleUpdateLink(
		accessoryRentalItemId: string,
		updates: Partial<AccessoryLinkDraft>,
	) {
		updateLinks(
			links.map((link) =>
				link.accessoryRentalItemId === accessoryRentalItemId
					? { ...link, ...updates }
					: link,
			),
		);
	}

	function handleRemoveLink(accessoryRentalItemId: string) {
		updateLinks(
			links.filter(
				(link) => link.accessoryRentalItemId !== accessoryRentalItemId,
			),
		);
	}

	async function handleSave() {
		setServerError(null);

		try {
			await replaceAccessoryLinks({
				productTypeId: product.id,
				dto: {
					accessoryLinks: links.map((link) => ({
						accessoryRentalItemId: link.accessoryRentalItemId,
						isDefaultIncluded: link.isDefaultIncluded,
						defaultQuantity: link.defaultQuantity,
						notes: link.notes.trim() || null,
					})),
				},
			});
			setSavedLinks(links);
			onDirtyChange(false);
		} catch (error) {
			setServerError(
				error instanceof Error
					? error.message
					: "No pudimos guardar los accesorios compatibles.",
			);
		}
	}

	return (
		<div className="space-y-8">
			<section className="space-y-3">
				<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
					<div>
						<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
							Accesorios compatibles
						</h3>
						<p className="mt-1 text-sm text-muted-foreground">
							Configura sugerencias por defecto para preparacion. Esto no crea
							lineas de accesorios en ordenes.
						</p>
					</div>

					<Button onClick={handleSave} disabled={!isDirty || isSaving}>
						<Save className="mr-1.5 size-3.5" />
						{isSaving ? "Guardando..." : "Guardar accesorios"}
					</Button>
				</div>

				{serverError && (
					<p className="text-sm text-destructive">{serverError}</p>
				)}
			</section>

			<section className="space-y-3 rounded-md border p-4">
				<label className="text-sm font-medium" htmlFor={accessorySearchId}>
					Buscar accesorios activos
				</label>
				<Input
					id={accessorySearchId}
					type="search"
					placeholder="Buscar por nombre"
					value={search}
					onChange={(event) => setSearch(event.target.value)}
				/>

				<div className="rounded-md border divide-y">
					{isFetching && (
						<p className="px-4 py-3 text-sm text-muted-foreground">
							Buscando accesorios...
						</p>
					)}

					{!isFetching && availableAccessories.length === 0 && (
						<p className="px-4 py-3 text-sm text-muted-foreground">
							No hay accesorios activos disponibles para agregar.
						</p>
					)}

					{!isFetching &&
						availableAccessories.map((accessory) => (
							<div
								key={accessory.id}
								className="flex items-center justify-between gap-4 px-4 py-3"
							>
								<div>
									<p className="text-sm font-medium">{accessory.name}</p>
									<p className="text-xs text-muted-foreground">
										{accessory.billingUnit.label}
									</p>
								</div>
								<Button
									type="button"
									variant="outline"
									size="sm"
									onClick={() => handleAddAccessory(accessory)}
								>
									<Plus className="mr-1.5 size-3.5" />
									Agregar
								</Button>
							</div>
						))}
				</div>
			</section>

			<section className="space-y-3">
				<h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
					Compatibilidad configurada
				</h3>

				{links.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						No hay accesorios compatibles configurados.
					</p>
				) : (
					<div className="space-y-3">
						{links.map((link) => (
							<AccessoryLinkRow
								key={link.accessoryRentalItemId}
								link={link}
								onUpdate={(updates) =>
									handleUpdateLink(link.accessoryRentalItemId, updates)
								}
								onRemove={() => handleRemoveLink(link.accessoryRentalItemId)}
							/>
						))}
					</div>
				)}
			</section>
		</div>
	);
}

function AccessoryLinkRow({
	link,
	onUpdate,
	onRemove,
}: {
	link: AccessoryLinkDraft;
	onUpdate: (updates: Partial<AccessoryLinkDraft>) => void;
	onRemove: () => void;
}) {
	const isRetired = link.accessoryRentalItem.retiredAt !== null;

	return (
		<div className="rounded-md border p-4">
			<div className="grid gap-4 md:grid-cols-[1fr_auto]">
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<p className="font-medium">{link.accessoryRentalItem.name}</p>
						{isRetired && <Badge variant="destructive">Retirado</Badge>}
						{link.isDefaultIncluded && (
							<Badge variant="secondary">Default</Badge>
						)}
					</div>
					<p className="text-xs text-muted-foreground">
						Este accesorio sera sugerido al preparar el item primario.
					</p>
				</div>

				<Button type="button" variant="ghost" size="icon" onClick={onRemove}>
					<Trash2 className="size-4" />
				</Button>
			</div>

			<div className="mt-4 grid gap-4 md:grid-cols-[auto_160px_1fr] md:items-start">
				<Label className="flex items-center gap-3 text-sm">
					<Switch
						checked={link.isDefaultIncluded}
						onCheckedChange={(checked) =>
							onUpdate({ isDefaultIncluded: checked })
						}
						aria-label={`Incluir ${link.accessoryRentalItem.name} por defecto`}
					/>
					Incluido por defecto
				</Label>

				<Label className="space-y-1 text-sm">
					<span className="font-medium">Cantidad</span>
					<Input
						type="number"
						min={1}
						value={link.defaultQuantity}
						onChange={(event) =>
							onUpdate({
								defaultQuantity: Math.max(1, Number(event.target.value) || 1),
							})
						}
					/>
				</Label>

				<Label className="space-y-1 text-sm">
					<span className="font-medium">Notas</span>
					<Textarea
						value={link.notes}
						onChange={(event) => onUpdate({ notes: event.target.value })}
						placeholder="Notas internas para preparacion"
					/>
				</Label>
			</div>
		</div>
	);
}

function toDraftLinks(
	links: ProductTypeAccessoryLinkResponse[],
): AccessoryLinkDraft[] {
	return links.map((link) => ({
		accessoryRentalItemId: link.accessoryRentalItemId,
		isDefaultIncluded: link.isDefaultIncluded,
		defaultQuantity: link.defaultQuantity,
		notes: link.notes ?? "",
		accessoryRentalItem: link.accessoryRentalItem,
	}));
}

function areAccessoryLinksEqual(
	left: AccessoryLinkDraft[],
	right: AccessoryLinkDraft[],
) {
	return (
		JSON.stringify(toComparableLinks(left)) ===
		JSON.stringify(toComparableLinks(right))
	);
}

function toComparableLinks(links: AccessoryLinkDraft[]) {
	return links.map((link) => ({
		accessoryRentalItemId: link.accessoryRentalItemId,
		isDefaultIncluded: link.isDefaultIncluded,
		defaultQuantity: link.defaultQuantity,
		notes: link.notes.trim() || null,
	}));
}
