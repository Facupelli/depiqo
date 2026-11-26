import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@repo/ui/components/popover";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Plus, X } from "lucide-react";
import { type ReactNode, useState } from "react";
import { equipmentTypeAssetsQueries } from "@/modules/inventory/equipment-types/equipment-type-detail/units/equipment-type-assets.queries";
import { useEquipmentTypeOptions } from "@/modules/inventory/equipment-types/equipment-type-options.queries";
import useDebounce from "@/shared/hooks/use-debounce";
import { getUnitLabel } from "./unit-availability.utils";
import { UnitAvailabilityPagination } from "./unit-availability-pagination";

type Choice = { id: string; label: string };
export type TimelineSelection = {
	types: Choice[];
	units: Choice[];
};

type SelectionKind = keyof TimelineSelection;
const selectionLimit = 100;

export function UnitAvailabilityFilters({
	branchId,
	selection,
	onChange,
}: {
	branchId: string;
	selection: TimelineSelection;
	onChange: (selection: TimelineSelection) => void;
}) {
	function add(kind: SelectionKind, choice: Choice) {
		const current = selection[kind];
		if (
			current.length < selectionLimit &&
			!current.some(({ id }) => id === choice.id)
		) {
			onChange({ ...selection, [kind]: [...current, choice] });
		}
	}

	const selectionGroups = [
		{ kind: "types", label: "Tipos de equipo", items: selection.types },
		{ kind: "units", label: "Unidades", items: selection.units },
	] as const;
	const hasSelection = selection.types.length > 0 || selection.units.length > 0;

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap items-center gap-2">
				<FilterPicker
					title="Agregar tipos de equipo"
					full={selection.types.length >= selectionLimit}
				>
					{() => (
						<TypeChoices
							excludeIds={selection.types.map(({ id }) => id)}
							onSelect={(choice) => add("types", choice)}
						/>
					)}
				</FilterPicker>
				<FilterPicker
					title="Agregar unidades"
					full={selection.units.length >= selectionLimit}
				>
					{() => (
						<UnitPicker
							branchId={branchId}
							pickedIds={selection.units.map(({ id }) => id)}
							onSelect={(choice) => add("units", choice)}
						/>
					)}
				</FilterPicker>
				{hasSelection && (
					<Button
						type="button"
						size="sm"
						variant="ghost"
						onClick={() => onChange({ types: [], units: [] })}
					>
						Limpiar filtros
					</Button>
				)}
			</div>
			{hasSelection && (
				<div className="space-y-2">
					{selectionGroups
						.filter(({ items }) => items.length > 0)
						.map(({ kind, label, items }) => (
							<div key={kind} className="flex flex-wrap items-center gap-2">
								<span className="text-xs font-medium text-neutral-600">
									{label}:
								</span>
								{items.map((choice) => (
									<Button
										key={choice.id}
										type="button"
										variant="secondary"
										size="xs"
										className="max-w-full"
										aria-label={`Quitar ${choice.label}`}
										onClick={() =>
											onChange({
												...selection,
												[kind]: items.filter(({ id }) => id !== choice.id),
											})
										}
									>
										<span className="truncate">{choice.label}</span>
										<X aria-hidden="true" />
									</Button>
								))}
							</div>
						))}
				</div>
			)}
		</div>
	);
}

function FilterPicker({
	title,
	full,
	children,
}: {
	title: string;
	full: boolean;
	children: () => ReactNode;
}) {
	const [open, setOpen] = useState(false);
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={<Button type="button" variant="outline" size="sm" />}
			>
				<Plus aria-hidden="true" />
				{title}
			</PopoverTrigger>
			<PopoverContent
				align="start"
				className="w-80 max-w-(--available-width) p-3"
			>
				<PopoverTitle>{title}</PopoverTitle>
				{full ? (
					<p className="text-xs text-neutral-600">
						Ya seleccionaste {selectionLimit}. Quita una selección para agregar
						otra.
					</p>
				) : (
					open && children()
				)}
			</PopoverContent>
		</Popover>
	);
}

function TypeChoices({
	excludeIds,
	onSelect,
}: {
	excludeIds?: string[];
	onSelect: (choice: Choice) => void;
}) {
	const [search, setSearch] = useState("");
	const debouncedSearch = useDebounce(search.trim(), 250);
	const query = useEquipmentTypeOptions({
		search: debouncedSearch,
		excludeIds,
		limit: 50,
	});

	return (
		<>
			<Input
				aria-label="Buscar tipo de equipo"
				placeholder="Buscar tipo de equipo"
				value={search}
				onChange={(event) => setSearch(event.target.value)}
			/>
			<PickerResults
				pending={query.isPending || search.trim() !== debouncedSearch}
				error={query.isError}
				retry={() => query.refetch()}
				empty={!query.data?.length}
				emptyMessage="No encontramos tipos de equipo."
			>
				{query.data?.map(({ id, name }) => (
					<li key={id}>
						<PickerChoice
							label={name}
							onClick={() => onSelect({ id, label: name })}
						/>
					</li>
				))}
			</PickerResults>
			{query.data?.length === 50 && (
				<p className="text-xs text-neutral-600">
					Escribe un nombre para acotar la búsqueda.
				</p>
			)}
		</>
	);
}

function UnitPicker({
	branchId,
	pickedIds,
	onSelect,
}: {
	branchId: string;
	pickedIds: string[];
	onSelect: (choice: Choice) => void;
}) {
	const [type, setType] = useState<Choice>();
	if (!type) {
		return (
			<>
				<p className="text-xs text-neutral-600">
					Elige un tipo para buscar sus unidades en esta sucursal.
				</p>
				<TypeChoices onSelect={setType} />
			</>
		);
	}
	return (
		<>
			<Button
				type="button"
				size="sm"
				variant="ghost"
				className="self-start"
				onClick={() => setType(undefined)}
			>
				<ArrowLeft aria-hidden="true" /> Cambiar tipo
			</Button>
			<p className="font-medium wrap-anywhere">{type.label}</p>
			<UnitChoices
				branchId={branchId}
				type={type}
				pickedIds={pickedIds}
				onSelect={onSelect}
			/>
		</>
	);
}

function UnitChoices({
	branchId,
	type,
	pickedIds,
	onSelect,
}: {
	branchId: string;
	type: Choice;
	pickedIds: string[];
	onSelect: (choice: Choice) => void;
}) {
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const debouncedSearch = useDebounce(search.trim(), 250);
	const query = useQuery(
		equipmentTypeAssetsQueries.list(
			type.id,
			{ branchId, search: debouncedSearch, page, pageSize: 20 },
			{ placeholderData: undefined },
		),
	);
	const totalPages = query.data
		? Math.ceil(query.data.total / query.data.pageSize)
		: 0;

	return (
		<>
			<Input
				aria-label="Buscar unidad"
				placeholder="Buscar por número de serie"
				value={search}
				onChange={(event) => {
					setSearch(event.target.value);
					setPage(1);
				}}
			/>
			<PickerResults
				pending={query.isPending || search.trim() !== debouncedSearch}
				error={query.isError}
				retry={() => query.refetch()}
				empty={!query.data?.data.length}
				emptyMessage="No encontramos unidades de este tipo en la sucursal."
			>
				{query.data?.data.map(({ id, serialNumber }) => {
					const label = getUnitLabel(serialNumber, id);
					return (
						<li key={id}>
							<PickerChoice
								label={label}
								selected={pickedIds.includes(id)}
								onClick={() =>
									onSelect({ id, label: `${type.label} · ${label}` })
								}
							/>
						</li>
					);
				})}
			</PickerResults>
			{totalPages > 1 && (
				<UnitAvailabilityPagination
					page={page}
					totalPages={totalPages}
					onPageChange={setPage}
				/>
			)}
		</>
	);
}

function PickerChoice({
	label,
	onClick,
	selected,
}: {
	label: string;
	onClick: () => void;
	selected?: boolean;
}) {
	return (
		<Button
			type="button"
			variant="ghost"
			className="h-auto min-h-9 w-full justify-start text-left whitespace-normal"
			disabled={selected}
			onClick={onClick}
		>
			<span className="min-w-0 wrap-anywhere">{label}</span>
			{selected && <span className="ml-auto text-xs">Agregada</span>}
		</Button>
	);
}

function PickerResults({
	pending,
	error,
	empty,
	retry,
	emptyMessage,
	children,
}: {
	pending: boolean;
	error: boolean;
	empty: boolean;
	retry: () => void;
	emptyMessage: string;
	children: ReactNode;
}) {
	if (pending)
		return <output className="text-xs text-neutral-600">Buscando…</output>;
	if (error)
		return (
			<div className="space-y-2">
				<p role="alert" className="text-xs">
					No pudimos cargar las opciones.
				</p>
				<Button type="button" variant="outline" size="sm" onClick={retry}>
					Reintentar
				</Button>
			</div>
		);
	if (empty) return <p className="text-xs text-neutral-600">{emptyMessage}</p>;
	return <ul className="max-h-56 space-y-0.5 overflow-y-auto">{children}</ul>;
}
