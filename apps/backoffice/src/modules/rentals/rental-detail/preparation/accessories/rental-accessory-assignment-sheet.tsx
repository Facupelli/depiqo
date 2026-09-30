import type { GetRentalAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import { Button } from "@repo/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, PackagePlus } from "lucide-react";
import { useState } from "react";
import type { GetRentalDetailViewResponseDto } from "@/modules/rentals/rental-detail/get-rental-detail-view/get-rental-detail-view.schema";
import { useRentalDetailContext } from "@/modules/rentals/rental-detail/rental-detail.context";
import { rentalDetailViewQueries } from "@/modules/rentals/rental-detail/rental-detail.queries";
import {
	type AssignRentalAccessoriesUiError,
	toAssignRentalAccessoriesUiError,
} from "./assign-rental-accessories.errors";
import { useAssignRentalAccessories } from "./assign-rental-accessories.mutation";
import {
	createRentalAccessoryAssignmentFormDefaultValues,
	type RentalAccessoryAssignmentFormValues,
	toAssignRentalAccessoriesDto,
} from "./rental-accessory-assignment.schema";
import { createSharedAccessoryCapacityByEquipmentType } from "./rental-accessory-assignment.utils";
import { RentalAccessoryAssignmentForm } from "./rental-accessory-assignment-form";
import {
	rentalAccessoryDefaultQueries,
	useRentalAccessoryDefaults,
} from "./rental-accessory-defaults.queries";

interface RentalAccessoryAssignmentSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function RentalAccessoryAssignmentSheet({
	open,
	onOpenChange,
}: RentalAccessoryAssignmentSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full max-w-full min-w-0 gap-0 overflow-hidden p-0 data-[side=right]:w-[90%] data-[side=right]:sm:max-w-160">
				<SheetHeader className="min-w-0 border-neutral-200 border-b px-4 py-5 sm:px-6">
					<div className="flex items-start gap-3 pr-10">
						<SheetTitle>Asignar accesorios</SheetTitle>
					</div>
				</SheetHeader>
				{open ? (
					<RentalAccessoryAssignmentSheetBody
						onClose={() => onOpenChange(false)}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function RentalAccessoryAssignmentSheetBody({
	onClose,
}: {
	onClose: () => void;
}) {
	const { rental } = useRentalDetailContext();
	const { data: defaults, isPending } = useRentalAccessoryDefaults(rental.id);

	if (isPending) {
		return (
			<div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
				<div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
				<div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
				<div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
			</div>
		);
	}

	if (!defaults) {
		return (
			<div className="flex min-w-0 flex-1 items-center justify-center px-4 py-12 sm:px-6">
				<div className="max-w-md text-center">
					<AlertCircle className="mx-auto mb-3 size-8 text-red-500" />
					<p className="font-semibold text-neutral-950">
						No pudimos cargar los accesorios sugeridos.
					</p>
					<p className="mt-1 text-neutral-500 text-sm">
						Cierra el panel e intenta nuevamente.
					</p>
				</div>
			</div>
		);
	}

	return (
		<RentalAccessoryAssignmentEditor
			key={rental.id}
			initialRental={rental}
			initialDefaults={defaults}
			onClose={onClose}
		/>
	);
}

function RentalAccessoryAssignmentEditor({
	initialRental,
	initialDefaults,
	onClose,
}: {
	initialRental: GetRentalDetailViewResponseDto;
	initialDefaults: GetRentalAccessoryDefaultsResponseDto;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const assignAccessories = useAssignRentalAccessories();
	const [snapshot, setSnapshot] = useState({
		rental: initialRental,
		defaults: initialDefaults,
		revision: 0,
	});
	const [assignmentError, setAssignmentError] =
		useState<AssignRentalAccessoriesUiError>();
	const [refreshFailed, setRefreshFailed] = useState(false);
	const [isRefreshing, setIsRefreshing] = useState(false);

	async function refreshAndRebuild() {
		const [freshRental, freshDefaults] = await Promise.all([
			queryClient.fetchQuery(
				rentalDetailViewQueries.detail(snapshot.rental.id, { staleTime: 0 }),
			),
			queryClient.fetchQuery(
				rentalAccessoryDefaultQueries.detail(snapshot.rental.id, {
					staleTime: 0,
				}),
			),
		]);
		setSnapshot((current) => ({
			rental: freshRental,
			defaults: freshDefaults,
			revision: current.revision + 1,
		}));
		setRefreshFailed(false);
		setAssignmentError((current) =>
			current
				? {
						...current,
						message: `${current.message} Reiniciamos las cantidades con la información actual. Revisalas antes de guardar.`,
					}
				: current,
		);
	}

	async function retryRefresh() {
		setIsRefreshing(true);
		try {
			await refreshAndRebuild();
		} catch {
			setRefreshFailed(true);
		} finally {
			setIsRefreshing(false);
		}
	}

	async function handleSubmit(values: RentalAccessoryAssignmentFormValues) {
		setAssignmentError(undefined);
		try {
			const body = toAssignRentalAccessoriesDto(
				values,
				snapshot.rental.version,
				snapshot.rental.accessories,
			);
			await assignAccessories.mutateAsync({
				rentalId: snapshot.rental.id,
				body,
			});
			onClose();
		} catch (error) {
			const uiError = toAssignRentalAccessoriesUiError(error);
			setAssignmentError(uiError);
			if (uiError.shouldRefreshAvailability) {
				setIsRefreshing(true);
				try {
					await refreshAndRebuild();
				} catch {
					setRefreshFailed(true);
				} finally {
					setIsRefreshing(false);
				}
			}
		}
	}

	if (refreshFailed) {
		return (
			<div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-12 text-center sm:px-6">
				<AlertCircle className="size-8 text-red-500" />
				<p className="max-w-md text-sm text-red-950" role="alert">
					No pudimos actualizar el pedido después de un cambio. Reintentá la
					actualización antes de guardar los accesorios.
				</p>
				<div className="flex gap-2">
					<Button type="button" variant="outline" onClick={onClose}>
						Cerrar
					</Button>
					<Button type="button" onClick={retryRefresh} disabled={isRefreshing}>
						{isRefreshing ? "Actualizando..." : "Reintentar actualización"}
					</Button>
				</div>
			</div>
		);
	}

	const demandLines = snapshot.rental.selections.flatMap(
		(selection) => selection.demandLines,
	);
	const defaultValues = createRentalAccessoryAssignmentFormDefaultValues({
		defaults: snapshot.defaults,
		demandLines,
		existingAccessories: snapshot.rental.accessories,
	});

	if (defaultValues.groups.length === 0) {
		return (
			<div className="flex min-w-0 flex-1 flex-col">
				{assignmentError ? (
					<p
						className="mx-4 mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-950 text-sm sm:mx-6"
						role="alert"
					>
						{assignmentError.message}
					</p>
				) : null}
				<div className="flex min-w-0 flex-1 items-center justify-center px-4 py-12 sm:px-6">
					<div className="max-w-md text-center">
						<PackagePlus className="mx-auto mb-3 size-9 text-neutral-300" />
						<p className="font-semibold text-neutral-950">
							No hay accesorios sugeridos para este pedido.
						</p>
						<p className="mt-1 text-neutral-500 text-sm">
							Los equipos de este rental no tienen accesorios por defecto para
							asignar.
						</p>
					</div>
				</div>
				<div className="flex justify-end border-neutral-200 border-t px-4 py-4 sm:px-6">
					<Button type="button" variant="outline" onClick={onClose}>
						Cerrar
					</Button>
				</div>
			</div>
		);
	}

	const sharedCapacityByEquipmentType =
		createSharedAccessoryCapacityByEquipmentType(snapshot.defaults);

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
				<RentalAccessoryAssignmentForm
					key={snapshot.revision}
					defaultValues={defaultValues}
					sharedCapacityByEquipmentType={sharedCapacityByEquipmentType}
					isPending={assignAccessories.isPending || isRefreshing}
					error={assignmentError}
					onSubmit={handleSubmit}
					onCancel={onClose}
					onAccessoryQuantityChange={() => setAssignmentError(undefined)}
				/>
			</div>
		</div>
	);
}
