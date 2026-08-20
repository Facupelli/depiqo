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
			<SheetContent className="gap-0 overflow-hidden p-0 w-160 min-w-160 max-w-160">
				<SheetHeader className="border-neutral-200 border-b px-6 py-5">
					<div className="flex items-start gap-3 pr-10">
						<SheetTitle>Asignar accesorios</SheetTitle>
					</div>
				</SheetHeader>
				<RentalAccessoryAssignmentSheetBody
					onClose={() => onOpenChange(false)}
				/>
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
	const queryClient = useQueryClient();
	const [assignmentError, setAssignmentError] =
		useState<AssignRentalAccessoriesUiError>();
	const {
		data: defaults,
		isPending,
		isError,
	} = useRentalAccessoryDefaults(rental.id);
	const assignAccessories = useAssignRentalAccessories();

	async function handleSubmit(values: RentalAccessoryAssignmentFormValues) {
		setAssignmentError(undefined);

		try {
			const body = toAssignRentalAccessoriesDto(values);
			await assignAccessories.mutateAsync({ rentalId: rental.id, body });
			onClose();
		} catch (error) {
			const uiError = toAssignRentalAccessoriesUiError(error);
			setAssignmentError(uiError);

			if (uiError.shouldRefreshAvailability) {
				await Promise.all([
					queryClient.fetchQuery(
						rentalAccessoryDefaultQueries.detail(rental.id),
					),
					queryClient.fetchQuery(rentalDetailViewQueries.detail(rental.id)),
				]).catch(() => undefined);
			}
		}
	}

	if (isPending) {
		return (
			<div className="flex-1 space-y-4 overflow-auto px-6 py-6">
				<div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
				<div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
				<div className="h-28 animate-pulse rounded-2xl bg-neutral-100" />
			</div>
		);
	}

	if (isError || !defaults) {
		return (
			<div className="flex flex-1 items-center justify-center px-6 py-12">
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

	if (defaults.suggestions.length === 0) {
		return (
			<div className="flex flex-1 flex-col">
				<div className="flex flex-1 items-center justify-center px-6 py-12">
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
				<div className="flex justify-end border-neutral-200 border-t px-6 py-4">
					<Button type="button" variant="outline" onClick={onClose}>
						Cerrar
					</Button>
				</div>
			</div>
		);
	}

	const defaultValues = createRentalAccessoryAssignmentFormDefaultValues({
		defaults,
		existingAccessories: rental.accessories,
	});
	const sharedCapacityByEquipmentType =
		createSharedAccessoryCapacityByEquipmentType(defaults);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<div className="flex-1 overflow-auto px-6 py-6">
				<RentalAccessoryAssignmentForm
					key={defaults.rentalOrderId}
					defaultValues={defaultValues}
					sharedCapacityByEquipmentType={sharedCapacityByEquipmentType}
					isPending={assignAccessories.isPending}
					error={assignmentError}
					onSubmit={handleSubmit}
					onCancel={onClose}
					onAccessoryQuantityChange={() => setAssignmentError(undefined)}
				/>
			</div>
		</div>
	);
}
