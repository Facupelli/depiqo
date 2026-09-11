import type { GetRentalAccessoryDefaultsResponseDto } from "@repo/api-contracts";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@repo/ui/components/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRentalDetailContext } from "@/modules/rentals/rental-detail/rental-detail.context";
import { rentalDetailViewQueries } from "@/modules/rentals/rental-detail/rental-detail.queries";
import type {
	GetRentalDetailViewResponseDto,
	RentalDetailViewDemandLineDto,
} from "../../get-rental-detail-view/get-rental-detail-view.schema";
import {
	type AssignRentalAccessoriesUiError,
	toAssignRentalAccessoriesUiError,
} from "./assign-rental-accessories.errors";
import {
	createDemandLineAccessoryAssignmentFormDefaultValues,
	createDemandLineAccessoryMetadata,
	type DemandLineAccessoryAssignmentFormValues,
	toReplaceRentalDemandLineAccessoriesDto,
} from "./demand-line-accessory-assignment.schema";
import { DemandLineAccessoryAssignmentForm } from "./demand-line-accessory-assignment-form";
import {
	rentalAccessoryDefaultQueries,
	useRentalAccessoryDefaults,
} from "./rental-accessory-defaults.queries";
import { useReplaceRentalDemandLineAccessories } from "./replace-rental-demand-line-accessories.mutation";

interface DemandLineAccessoryAssignmentSheetProps {
	demandLine: RentalDetailViewDemandLineDto | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function DemandLineAccessoryAssignmentSheet({
	demandLine,
	open,
	onOpenChange,
}: DemandLineAccessoryAssignmentSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full max-w-full min-w-0 gap-0 overflow-hidden p-0 data-[side=right]:w-[90%] data-[side=right]:sm:max-w-160">
				<SheetHeader className="min-w-0 border-neutral-200 border-b px-4 py-5 sm:px-6">
					<SheetTitle>Asignar accesorios</SheetTitle>
					<SheetDescription>
						{demandLine
							? `Equipo: ${demandLine.equipmentTypeName}`
							: "Selecciona un equipo para gestionar sus accesorios."}
					</SheetDescription>
				</SheetHeader>
				{demandLine ? (
					<DemandLineAccessoryAssignmentSheetBody
						key={demandLine.id}
						demandLine={demandLine}
						onClose={() => onOpenChange(false)}
					/>
				) : null}
			</SheetContent>
		</Sheet>
	);
}

function DemandLineAccessoryAssignmentSheetBody({
	demandLine,
	onClose,
}: {
	demandLine: RentalDetailViewDemandLineDto;
	onClose: () => void;
}) {
	const { rental } = useRentalDetailContext();
	const defaultsQuery = useRentalAccessoryDefaults(rental.id);

	if (defaultsQuery.isPending) {
		return (
			<div className="min-w-0 flex-1 space-y-4 overflow-y-auto px-4 py-6 sm:px-6">
				<div className="h-20 animate-pulse rounded-md bg-neutral-100" />
				<div className="h-28 animate-pulse rounded-md bg-neutral-100" />
				<div className="h-28 animate-pulse rounded-md bg-neutral-100" />
			</div>
		);
	}

	return (
		<DemandLineAccessoryAssignmentEditor
			demandLine={demandLine}
			initialRental={rental}
			initialDefaults={defaultsQuery.data}
			initialDefaultsFailed={defaultsQuery.isError}
			onRetryDefaults={async () => (await defaultsQuery.refetch()).data}
			onClose={onClose}
		/>
	);
}

type EditorSnapshot = {
	rental: GetRentalDetailViewResponseDto;
	defaults?: GetRentalAccessoryDefaultsResponseDto;
	revision: number;
};

function DemandLineAccessoryAssignmentEditor({
	demandLine,
	initialRental,
	initialDefaults,
	initialDefaultsFailed,
	onRetryDefaults,
	onClose,
}: {
	demandLine: RentalDetailViewDemandLineDto;
	initialRental: GetRentalDetailViewResponseDto;
	initialDefaults?: GetRentalAccessoryDefaultsResponseDto;
	initialDefaultsFailed: boolean;
	onRetryDefaults: () => Promise<
		GetRentalAccessoryDefaultsResponseDto | undefined
	>;
	onClose: () => void;
}) {
	const queryClient = useQueryClient();
	const [snapshot, setSnapshot] = useState<EditorSnapshot>({
		rental: initialRental,
		defaults: initialDefaults,
		revision: 0,
	});
	const [assignmentError, setAssignmentError] =
		useState<AssignRentalAccessoriesUiError>();
	const [defaultsFailed, setDefaultsFailed] = useState(initialDefaultsFailed);
	const mutation = useReplaceRentalDemandLineAccessories();

	async function handleRetryDefaults() {
		const freshDefaults = await onRetryDefaults().catch(() => undefined);
		if (!freshDefaults) return undefined;
		setDefaultsFailed(false);
		setSnapshot((current) => ({
			...current,
			defaults: freshDefaults,
		}));
		return createDemandLineAccessoryAssignmentFormDefaultValues({
			rentalDemandLineId: demandLine.id,
			defaults: freshDefaults,
			existingAccessories: snapshot.rental.accessories,
		});
	}

	async function refreshAndRebuild() {
		const freshRental = await queryClient.fetchQuery(
			rentalDetailViewQueries.detail(snapshot.rental.id, { staleTime: 0 }),
		);
		const freshDefaults = await queryClient
			.fetchQuery(
				rentalAccessoryDefaultQueries.detail(snapshot.rental.id, {
					staleTime: 0,
				}),
			)
			.catch(() => undefined);
		setDefaultsFailed(!freshDefaults);
		setSnapshot((current) => ({
			rental: freshRental,
			defaults: freshDefaults,
			revision: current.revision + 1,
		}));
	}

	async function handleSubmit(values: DemandLineAccessoryAssignmentFormValues) {
		setAssignmentError(undefined);
		try {
			await mutation.mutateAsync({
				rentalId: snapshot.rental.id,
				rentalDemandLineId: demandLine.id,
				body: toReplaceRentalDemandLineAccessoriesDto(
					values,
					snapshot.rental.version,
				),
			});
			onClose();
		} catch (error) {
			const uiError = toAssignRentalAccessoriesUiError(error);
			setAssignmentError(uiError);
			if (uiError.shouldRefreshAvailability) {
				await refreshAndRebuild().catch(() => undefined);
			}
		}
	}

	const defaultValues = createDemandLineAccessoryAssignmentFormDefaultValues({
		rentalDemandLineId: demandLine.id,
		defaults: snapshot.defaults,
		existingAccessories: snapshot.rental.accessories,
	});
	const metadata = snapshot.defaults
		? createDemandLineAccessoryMetadata(demandLine.id, snapshot.defaults)
		: new Map();

	return (
		<div className="flex min-h-0 min-w-0 flex-1 flex-col">
			<div className="min-w-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
				<DemandLineAccessoryAssignmentForm
					key={snapshot.revision}
					defaultValues={defaultValues}
					metadataByEquipmentType={metadata}
					defaultsFailed={defaultsFailed}
					isPending={mutation.isPending}
					error={assignmentError}
					onRetryDefaults={handleRetryDefaults}
					onSubmit={handleSubmit}
					onCancel={onClose}
					onChange={() => setAssignmentError(undefined)}
				/>
			</div>
		</div>
	);
}
