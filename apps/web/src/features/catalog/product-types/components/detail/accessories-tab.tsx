import type {
	ProductTypeAccessoryLinkResponse,
	ProductTypeResponse,
} from "@repo/schemas";
import { useForm, useStore } from "@tanstack/react-form";
import {
	Check,
	Info,
	MoreHorizontal,
	Package,
	Plus,
	Search,
	X,
} from "lucide-react";
import { Fragment, type ReactNode, useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useReplaceProductTypeAccessoryLinks } from "@/features/catalog/product-types/product.mutations";
import { useAvailableProductTypeAccessories } from "@/features/catalog/product-types/products.queries";
import {
	type ProductTypeAccessoryLinkFormValues,
	productTypeAccessoryLinksFormDefaults,
	productTypeAccessoryLinksFormSchema,
	productTypeAccessoryLinkFormDefaults,
	toReplaceProductTypeAccessoryLinksDto,
} from "@/features/catalog/product-types/schemas/product-type-accessory-link-form.schema";
import useDebounce from "@/shared/hooks/use-debounce";
import { useProduct } from "./product-detail.context";

type AccessoryLinkDraft = ProductTypeAccessoryLinkFormValues & {
	accessoryRentalItem: ProductTypeAccessoryLinkResponse["accessoryRentalItem"];
};

interface AccessoriesTabProps {
	isActive: boolean;
	onDirtyChange: (isDirty: boolean) => void;
}

type SheetMode = { type: "add" } | { type: "edit"; link: AccessoryLinkDraft };

export function AccessoriesTab({
	isActive,
	onDirtyChange,
}: AccessoriesTabProps) {
	const { product } = useProduct();
	const [links, setLinks] = useState<AccessoryLinkDraft[]>(
		toDraftLinks(product.accessoryLinks ?? []),
	);
	const [sheetMode, setSheetMode] = useState<SheetMode | null>(null);
	const [serverError, setServerError] = useState<string | null>(null);
	const { mutateAsync: replaceAccessoryLinks, isPending } =
		useReplaceProductTypeAccessoryLinks();

	const defaultCount = links.filter((link) => link.isDefaultIncluded).length;
	const optionalCount = links.length - defaultCount;

	async function persistLinks(nextLinks: AccessoryLinkDraft[]) {
		setServerError(null);
		onDirtyChange(false);

		try {
			await replaceAccessoryLinks({
				productTypeId: product.id,
				dto: toReplaceProductTypeAccessoryLinksDto(nextLinks),
			});
			setLinks(nextLinks);
			return true;
		} catch (error) {
			setServerError(
				error instanceof Error
					? error.message
					: "No pudimos guardar los accesorios compatibles.",
			);
			return false;
		}
	}

	async function handleAddAccessories(
		values: ProductTypeAccessoryLinkFormValues[],
		accessories: ProductTypeResponse[],
	) {
		const accessoriesById = new Map(
			accessories.map((accessory) => [accessory.id, accessory]),
		);
		const nextDraftLinks: AccessoryLinkDraft[] = [];

		for (const value of values) {
			const accessory = accessoriesById.get(value.accessoryRentalItemId);

			if (!accessory) {
				setServerError("No pudimos preparar uno de los accesorios seleccionados.");
				return;
			}

			nextDraftLinks.push({
				...value,
				accessoryRentalItem: toAccessoryRentalItem(accessory),
			});
		}

		const nextLinks = [...links, ...nextDraftLinks];

		const saved = await persistLinks(nextLinks);
		if (saved) {
			setSheetMode(null);
		}
	}

	async function handleEditAccessory(
		values: ProductTypeAccessoryLinkFormValues,
	) {
		const nextLinks = links.map((link) =>
			link.accessoryRentalItemId === values.accessoryRentalItemId
				? { ...link, ...values }
				: link,
		);

		const saved = await persistLinks(nextLinks);
		if (saved) {
			setSheetMode(null);
		}
	}

	async function handleRemoveAccessory(accessoryRentalItemId: string) {
		await persistLinks(
			links.filter(
				(link) => link.accessoryRentalItemId !== accessoryRentalItemId,
			),
		);
	}

	return (
		<>
			<Card className="gap-4">
				<CardHeader>
					<div>
						<div className="flex items-center gap-2">
							<CardTitle className="text-xl font-semibold">
								Accesorios compatibles
							</CardTitle>
							<Info className="size-4 text-muted-foreground" />
						</div>
						<CardDescription className="mt-1">
							Estos accesorios se sugieren automaticamente durante la
							preparacion.
						</CardDescription>
					</div>
					<CardAction>
						<Button onClick={() => setSheetMode({ type: "add" })}>
							<Plus className="size-4" />
							Añadir accesorio compatible
						</Button>
					</CardAction>
				</CardHeader>

				<CardContent className="space-y-4">
					{serverError && (
						<p className="text-sm text-destructive">{serverError}</p>
					)}

					<div className="grid gap-3 md:grid-cols-3">
						<AccessoryStatCard
							icon={<Package className="size-5" />}
							iconClassName="bg-muted text-foreground"
							value={links.length}
							label="Total configurados"
						/>
						<AccessoryStatCard
							icon={<Check className="size-5" />}
							iconClassName="bg-muted text-foreground"
							value={defaultCount}
							label="Incluidos por defecto"
						/>
						<AccessoryStatCard
							icon={<Package className="size-5" />}
							iconClassName="bg-muted text-foreground"
							value={optionalCount}
							label="Opcionales"
						/>
					</div>

					{links.length === 0 ? (
						<div className="rounded-xl border px-4 py-6 text-sm text-muted-foreground">
							No hay accesorios compatibles configurados.
						</div>
					) : (
						<div className="space-y-2">
							{links.map((link) => (
								<AccessoryLinkCard
									key={link.accessoryRentalItemId}
									link={link}
									disabled={isPending}
									onEdit={() => setSheetMode({ type: "edit", link })}
									onRemove={() =>
										handleRemoveAccessory(link.accessoryRentalItemId)
									}
								/>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			{sheetMode && (
				<AccessorySheetForm
					key={
						sheetMode.type === "edit"
							? `edit-${sheetMode.link.accessoryRentalItemId}`
							: "add"
					}
					open={sheetMode !== null}
					mode={sheetMode}
					productTypeId={product.id}
					isActive={isActive}
					existingAccessoryIds={links.map((link) => link.accessoryRentalItemId)}
					isPending={isPending}
					onOpenChange={(open) => {
						if (!open) {
							setSheetMode(null);
						}
					}}
					onAdd={handleAddAccessories}
					onEdit={handleEditAccessory}
				/>
			)}
		</>
	);
}

function AccessoryStatCard({
	icon,
	iconClassName,
	value,
	label,
}: {
	icon: ReactNode;
	iconClassName: string;
	value: number;
	label: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
			<div className={`rounded-full p-2.5 ${iconClassName}`}>{icon}</div>
			<div>
				<p className="text-xl font-semibold leading-none">{value}</p>
				<p className="mt-0.5 text-sm text-muted-foreground">{label}</p>
			</div>
		</div>
	);
}

function AccessoryLinkCard({
	link,
	disabled,
	onEdit,
	onRemove,
}: {
	link: AccessoryLinkDraft;
	disabled: boolean;
	onEdit: () => void;
	onRemove: () => void;
}) {
	return (
		<div className="grid gap-2 rounded-xl border bg-card px-3 py-2 md:grid-cols-[minmax(14rem,1fr)_minmax(10rem,0.9fr)_auto] md:items-center">
			<div className="flex items-center gap-2.5">
				<AccessoryImage
					imageUrl={link.accessoryRentalItem.imageUrl}
					name={link.accessoryRentalItem.name}
					className="size-10"
				/>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-1.5">
						<p className="truncate font-semibold">
							{link.accessoryRentalItem.name}
						</p>
						<AccessoryModeBadge isDefaultIncluded={link.isDefaultIncluded} />
					</div>
					<div className="flex items-center gap-1.5 text-xs">
						<span className="text-muted-foreground">Cantidad</span>
						<span className="font-medium">{link.defaultQuantity}</span>
					</div>
				</div>
			</div>

			<div className="min-w-0">
				<p className="line-clamp-1 text-sm text-muted-foreground">
					{link.notes.trim() ||
						"Este accesorio sera sugerido al preparar el item primario."}
				</p>
			</div>

			<div className="flex justify-end gap-1">
				<Button
					type="button"
					variant="outline"
					size="sm"
					disabled={disabled}
					onClick={onEdit}
				>
					Editar
				</Button>
				<DropdownMenu>
					<DropdownMenuTrigger
						render={
							<Button
								type="button"
								variant="outline"
								size="icon-sm"
								disabled={disabled}
							/>
						}
					>
						<MoreHorizontal className="size-4" />
						<span className="sr-only">Abrir acciones</span>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-40">
						<DropdownMenuItem variant="destructive" onClick={onRemove}>
							Quitar accesorio
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</div>
	);
}

function AccessorySheetForm({
	open,
	mode,
	productTypeId,
	isActive,
	existingAccessoryIds,
	isPending,
	onOpenChange,
	onAdd,
	onEdit,
}: {
	open: boolean;
	mode: SheetMode;
	productTypeId: string;
	isActive: boolean;
	existingAccessoryIds: string[];
	isPending: boolean;
	onOpenChange: (open: boolean) => void;
	onAdd: (
		values: ProductTypeAccessoryLinkFormValues[],
		accessories: ProductTypeResponse[],
	) => Promise<void>;
	onEdit: (values: ProductTypeAccessoryLinkFormValues) => Promise<void>;
}) {
	const [search, setSearch] = useState("");
	const [selectedAccessories, setSelectedAccessories] = useState<
		ProductTypeResponse[]
	>([]);
	const debouncedSearch = useDebounce(search, 300);
	const formId = useId();
	const searchId = useId();
	const isEditMode = mode.type === "edit";
	const defaultValues =
		mode.type === "edit"
			? { accessoryLinks: [toFormValues(mode.link)] }
			: productTypeAccessoryLinksFormDefaults;

	const form = useForm({
		defaultValues,
		validators: { onSubmit: productTypeAccessoryLinksFormSchema },
		onSubmit: async ({ value }) => {
			const accessoryLinks = value.accessoryLinks;

			if (isEditMode) {
				const [editedLink] = accessoryLinks;
				if (!editedLink) {
					return;
				}

				await onEdit(editedLink);
				return;
			}

			if (accessoryLinks.length === 0) {
				return;
			}

			await onAdd(accessoryLinks, selectedAccessories);
		},
	});

	const values = useStore(form.store, (state) => state.values);
	const selectedAccessoryIds = values.accessoryLinks.map(
		(link) => link.accessoryRentalItemId,
	);
	const { data: accessoryResults, isFetching } =
		useAvailableProductTypeAccessories(
			productTypeId,
			{ search: debouncedSearch || undefined, limit: 12 },
			{ enabled: open && isActive && !isEditMode },
		);

	const availableAccessories = (accessoryResults?.data ?? []).filter(
		(accessory) => !existingAccessoryIds.includes(accessory.id),
	);
	const editAccessory = isEditMode ? mode.link.accessoryRentalItem : null;
	const canSubmit = isEditMode || values.accessoryLinks.length > 0;

	function handleAccessoryToggle(accessory: ProductTypeResponse) {
		const isSelected = selectedAccessoryIds.includes(accessory.id);

		if (isSelected) {
			const nextAccessories = selectedAccessories.filter(
				(selectedAccessory) => selectedAccessory.id !== accessory.id,
			);

			setSelectedAccessories(nextAccessories);
			form.setFieldValue(
				"accessoryLinks",
				values.accessoryLinks.filter(
					(link) => link.accessoryRentalItemId !== accessory.id,
				),
			);
			return;
		}

		setSelectedAccessories([...selectedAccessories, accessory]);
		form.setFieldValue("accessoryLinks", [
			...values.accessoryLinks,
			{
				...productTypeAccessoryLinkFormDefaults,
				accessoryRentalItemId: accessory.id,
			},
		]);
	}

	function renderAccessoryLinkFormRow({
		index,
		accessory,
		showRemove,
		onRemove,
	}: {
		index: number;
		accessory:
			| ProductTypeResponse
			| ProductTypeAccessoryLinkResponse["accessoryRentalItem"]
			| null
			| undefined;
		showRemove: boolean;
		onRemove: () => void;
	}): ReactNode {
		return (
			<div className="grid gap-3 rounded-xl border p-3 lg:grid-cols-[minmax(12rem,1fr)_auto_5rem_minmax(12rem,1fr)_auto] lg:items-center">
				<CompactAccessorySummary
					imageUrl={accessory?.imageUrl ?? ""}
					name={accessory?.name ?? "Accesorio seleccionado"}
					description="Accesorio compatible."
				/>

				<form.Field name={`accessoryLinks[${index}].isDefaultIncluded`}>
					{(field) => (
						<Label className="flex items-center gap-2 text-sm font-medium lg:justify-center">
							<Switch
								checked={field.state.value}
								onCheckedChange={field.handleChange}
								aria-label="Incluido por defecto"
							/>
							Por defecto
						</Label>
					)}
				</form.Field>

				<form.Field name={`accessoryLinks[${index}].defaultQuantity`}>
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Cant.</FieldLabel>
								<Input
									id={field.name}
									type="number"
									min={1}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) =>
										field.handleChange(
											Math.max(1, Number(event.target.value) || 1),
										)
									}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name={`accessoryLinks[${index}].notes`}>
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;

						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Notas</FieldLabel>
								<Input
									id={field.name}
									placeholder="Notas internas"
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(event) => field.handleChange(event.target.value)}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				{showRemove && (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						className="justify-self-end"
						onClick={onRemove}
					>
						<X className="size-4" />
						<span className="sr-only">Quitar accesorio</span>
					</Button>
				)}
			</div>
		);
	}

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full gap-0 p-0 sm:!max-w-none md:!w-[48rem] lg:!w-[54rem]">
				<SheetHeader className="border-b px-6 py-5">
					<SheetTitle className="text-xl font-semibold">
						{isEditMode ? "Editar accesorio" : "Añadir accesorio"}
					</SheetTitle>
				</SheetHeader>

				<div className="flex-1 overflow-y-auto px-6 py-5">
					{!isEditMode && (
						<div className="space-y-3">
							<label className="sr-only" htmlFor={searchId}>
								Buscar accesorios
							</label>
							<InputGroup>
								<InputGroupAddon>
									<Search className="size-4" />
								</InputGroupAddon>
								<InputGroupInput
									id={searchId}
									type="search"
									placeholder="Buscar accesorios"
									value={search}
									onChange={(event) => setSearch(event.target.value)}
								/>
							</InputGroup>

							<p className="text-sm text-muted-foreground">
								{isFetching
									? "Buscando accesorios..."
									: `${availableAccessories.length} resultados · ${values.accessoryLinks.length} seleccionados`}
							</p>

							<div className="max-h-72 overflow-y-auto rounded-xl border">
								{!isFetching && availableAccessories.length === 0 && (
									<p className="px-4 py-3 text-sm text-muted-foreground">
										No hay accesorios activos disponibles para agregar.
									</p>
								)}
								{availableAccessories.map((accessory) => (
									<AccessorySearchResult
										key={accessory.id}
										accessory={accessory}
										selected={selectedAccessoryIds.includes(accessory.id)}
										onSelect={() => handleAccessoryToggle(accessory)}
									/>
								))}
							</div>
						</div>
					)}

					<form
						id={formId}
						onSubmit={(event) => {
							event.preventDefault();
							event.stopPropagation();
							form.handleSubmit();
						}}
						className="mt-5 space-y-4"
					>
						<div className="space-y-2">
							<p className="font-medium">
								{isEditMode
									? "Configuracion del accesorio"
									: "Configura los accesorios seleccionados"}
							</p>
							<form.Field name="accessoryLinks" mode="array">
								{(field) => {
									const rows = field.state.value;

									if (rows.length === 0) {
										return (
											<div className="rounded-xl border p-3 text-sm text-muted-foreground">
												Selecciona accesorios para configurar sus valores por
												defecto.
											</div>
										);
									}

									return (
										<div className="space-y-2">
											{rows.map((link, index) => {
												const selectedAccessory = isEditMode
													? editAccessory
													: selectedAccessories.find(
														(accessory) =>
															accessory.id === link.accessoryRentalItemId,
													);

										return (
											<Fragment key={link.accessoryRentalItemId}>
												{renderAccessoryLinkFormRow({
													index,
													accessory: selectedAccessory,
													showRemove: !isEditMode,
													onRemove: () => {
														setSelectedAccessories(
															selectedAccessories.filter(
																(accessory) =>
																	accessory.id !==
																	link.accessoryRentalItemId,
															),
														);
														field.removeValue(index);
													},
												})}
											</Fragment>
										);
											})}
										</div>
									);
								}}
							</form.Field>
						</div>
					</form>
				</div>

				<SheetFooter className="grid grid-cols-2 border-t px-6 py-4">
					<Button
						type="button"
						variant="outline"
						onClick={() => onOpenChange(false)}
					>
						Cancelar
					</Button>
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canFormSubmit, isSubmitting]) => (
							<Button
								type="submit"
								form={formId}
								disabled={
									!canFormSubmit || !canSubmit || isSubmitting || isPending
								}
							>
								{isSubmitting || isPending
									? "Guardando..."
									: isEditMode
										? "Guardar"
										: values.accessoryLinks.length > 1
											? `Añadir ${values.accessoryLinks.length}`
											: "Añadir"}
							</Button>
						)}
					</form.Subscribe>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

function AccessorySearchResult({
	accessory,
	selected,
	onSelect,
}: {
	accessory: ProductTypeResponse;
	selected: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			className="grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/50 data-[selected=true]:bg-muted"
			data-selected={selected}
			onClick={onSelect}
		>
			<AccessoryImage
				imageUrl={accessory.imageUrl}
				name={accessory.name}
				className="size-10"
			/>
			<div className="min-w-0">
				<p className="truncate font-medium">{accessory.name}</p>
				<p className="line-clamp-1 text-sm text-muted-foreground">
					{accessory.description || accessory.billingUnit.label}
				</p>
			</div>
			<div className="text-right text-xs text-muted-foreground">
				<p className="text-foreground">
					<span className="mr-1 inline-block size-2 rounded-full bg-emerald-500" />
					Disponibles
				</p>
				<p>{accessory.assetCount} unidades</p>
			</div>
		</button>
	);
}

function CompactAccessorySummary({
	imageUrl,
	name,
	description,
}: {
	imageUrl: string;
	name: string;
	description: string | null;
}) {
	return (
		<div className="flex min-w-0 items-center gap-3">
			<AccessoryImage imageUrl={imageUrl} name={name} className="size-10" />
			<div className="min-w-0">
				<p className="truncate font-semibold">{name}</p>
				<p className="line-clamp-1 text-sm text-muted-foreground">
					{description || "Accesorio compatible."}
				</p>
			</div>
		</div>
	);
}

function AccessoryModeBadge({
	isDefaultIncluded,
}: {
	isDefaultIncluded: boolean;
}) {
	return isDefaultIncluded ? (
		<Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
			Por defecto
		</Badge>
	) : (
		<Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
			Opcional
		</Badge>
	);
}

function AccessoryImage({
	imageUrl,
	name,
	className,
}: {
	imageUrl: string;
	name: string;
	className: string;
}) {
	const src = imageUrl ? `${getProductImageBaseUrl()}/${imageUrl}` : null;

	if (!src) {
		return (
			<div
				className={`${className} shrink-0 rounded-lg bg-muted`}
				aria-hidden="true"
			/>
		);
	}

	return (
		<img
			src={src}
			alt={name}
			loading="lazy"
			decoding="async"
			className={`${className} shrink-0 rounded-lg object-contain`}
		/>
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

function toFormValues(
	link: AccessoryLinkDraft,
): ProductTypeAccessoryLinkFormValues {
	return {
		accessoryRentalItemId: link.accessoryRentalItemId,
		isDefaultIncluded: link.isDefaultIncluded,
		defaultQuantity: link.defaultQuantity,
		notes: link.notes,
	};
}

function toAccessoryRentalItem(
	accessory: ProductTypeResponse,
): ProductTypeAccessoryLinkResponse["accessoryRentalItem"] {
	return {
		id: accessory.id,
		name: accessory.name,
		imageUrl: accessory.imageUrl,
		trackingMode: accessory.trackingMode,
		retiredAt: accessory.retiredAt,
	};
}

function getProductImageBaseUrl() {
	return (
		(
			import.meta as ImportMeta & {
				env?: { VITE_R2_PUBLIC_URL?: string };
			}
		).env?.VITE_R2_PUBLIC_URL ?? ""
	);
}
