import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { AddUnitsDialog } from "../add-units/add-units-dialog";
import { EditEquipmentTypeDialog } from "../edit-equipment-type/edit-equipment-type-dialog";
import { EquipmentDetailNavigation } from "./equipment-detail-navigation";
import { EquipmentTypeDetailActionsProvider } from "./equipment-type-detail-actions";
import { EquipmentTypeHeader } from "./equipment-type-header";
import { equipmentTypeSummaryQueries } from "./equipment-type-summary.queries";

export function EquipmentTypeDetailPage({
	equipmentTypeId,
}: {
	equipmentTypeId: string;
}) {
	const { data: summary } = useSuspenseQuery(
		equipmentTypeSummaryQueries.summary(equipmentTypeId),
	);
	const [editOpen, setEditOpen] = useState(false);
	const [addUnitsOpen, setAddUnitsOpen] = useState(false);
	const imageUrl = buildR2PublicUrl(summary.imageUrl, "catalog");

	return (
		<div className="px-4 pb-8 sm:px-6">
			<PageBreadcrumb
				parent={{
					label: "Equipos",
					to: "/dashboard/inventory/equipment-types",
				}}
				current={summary.name}
			/>

			<EquipmentTypeDetailActionsProvider
				value={{ openAddUnits: () => setAddUnitsOpen(true) }}
			>
				<div className="flex flex-col">
					<EquipmentTypeHeader
						name={summary.name}
						imageUrl={imageUrl}
						categoryName={summary.categoryName}
						description={summary.description}
						activeAssetCount={summary.activeAssetCount}
						onEdit={() => setEditOpen(true)}
						onAddUnit={() => setAddUnitsOpen(true)}
					/>
					<EquipmentDetailNavigation equipmentTypeId={equipmentTypeId} />
					<div className="mt-5">
						<Outlet />
					</div>
				</div>
			</EquipmentTypeDetailActionsProvider>

			<EditEquipmentTypeDialog
				open={editOpen}
				onOpenChange={setEditOpen}
				equipmentTypeId={equipmentTypeId}
			/>
			<AddUnitsDialog
				equipmentTypeId={equipmentTypeId}
				open={addUnitsOpen}
				onOpenChange={setAddUnitsOpen}
			/>
		</div>
	);
}
