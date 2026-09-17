import {
	TenantPermission,
	type TenantPermission as TenantPermissionId,
} from "@repo/api-contracts";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { useState } from "react";
import { can, canAll } from "@/auth/permissions";
import { PageBreadcrumb } from "@/components/detail-id-breadcrumb";
import { DetailPageShell } from "@/components/detail-page-shell";
import { buildR2PublicUrl } from "@/lib/r2-public-url";
import { AddUnitsDialog } from "../add-units/add-units-dialog";
import { EditEquipmentTypeDialog } from "../edit-equipment-type/edit-equipment-type-dialog";
import { EquipmentDetailNavigation } from "./equipment-detail-navigation";
import { EquipmentTypeDetailProvider } from "./equipment-type-detail-context";
import { EquipmentTypeHeader } from "./equipment-type-header";
import { equipmentTypeSummaryQueries } from "./equipment-type-summary.queries";

export function EquipmentTypeDetailPage({
	equipmentTypeId,
	permissions,
}: {
	equipmentTypeId: string;
	permissions: readonly TenantPermissionId[];
}) {
	const { data: summary } = useSuspenseQuery(
		equipmentTypeSummaryQueries.summary(equipmentTypeId),
	);
	const [editOpen, setEditOpen] = useState(false);
	const [addUnitsOpen, setAddUnitsOpen] = useState(false);
	const imageUrl = buildR2PublicUrl(summary.imageUrl, "catalog");
	const capabilities = {
		manageInventory: can(permissions, TenantPermission.InventoryManage),
		manageOwnership: can(
			permissions,
			TenantPermission.InventoryOwnershipManage,
		),
		manageProducts: can(permissions, TenantPermission.ProductsManage),
		manageAvailability: can(
			permissions,
			TenantPermission.ProductsAvailabilityManage,
		),
		managePricing: can(permissions, TenantPermission.PricingManage),
		createProduct: canAll(permissions, [
			TenantPermission.ProductsManage,
			TenantPermission.ProductsAvailabilityManage,
		]),
	};

	return (
		<div className="pb-8">
			<EquipmentTypeDetailProvider
				value={{
					actions: { openAddUnits: () => setAddUnitsOpen(true) },
					capabilities,
				}}
			>
				<DetailPageShell
					breadcrumb={
						<PageBreadcrumb
							parent={{
								label: "Equipos",
								to: "/dashboard/inventory/equipment-types",
							}}
							current={summary.name}
						/>
					}
					header={
						<EquipmentTypeHeader
							name={summary.name}
							imageUrl={imageUrl}
							categoryName={summary.categoryName}
							description={summary.description}
							activeAssetCount={summary.activeAssetCount}
							onEdit={
								capabilities.manageInventory
									? () => setEditOpen(true)
									: undefined
							}
							onAddUnit={
								capabilities.manageInventory
									? () => setAddUnitsOpen(true)
									: undefined
							}
						/>
					}
					navigation={
						<EquipmentDetailNavigation equipmentTypeId={equipmentTypeId} />
					}
				>
					<Outlet />
				</DetailPageShell>
			</EquipmentTypeDetailProvider>

			{capabilities.manageInventory ? (
				<>
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
				</>
			) : null}
		</div>
	);
}
