import { Button } from "@repo/ui/components/button";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { withForm } from "@/shared/contexts/form.context";
import { createEquipmentFormDefaultValues } from "./create-equipment.schema";
import { WizardStepHeading } from "./wizard-step-heading";

interface ReferenceItem {
	id: string;
	name: string;
}

export const ReviewStep = withForm({
	defaultValues: createEquipmentFormDefaultValues(),
	props: {
		categories: [] as ReferenceItem[],
		branches: [] as ReferenceItem[],
		onEdit: (_step: number) => {},
	},
	render: function Render({ form, categories, branches, onEdit }) {
		return (
			<form.Subscribe selector={(state) => state.values}>
				{(values) => {
					const categoryName = (id: string) => {
						if (id === "") return "Sin categoría";
						return (
							categories.find((category) => category.id === id)?.name ??
							"Categoría no disponible"
						);
					};
					const branchName = (id: string) =>
						branches.find((branch) => branch.id === id)?.name ??
						"Sucursal no disponible";
					const unitsByBranchId = values.assets.reduce<Record<string, number>>(
						(summary, asset) => {
							summary[asset.branchId] = (summary[asset.branchId] ?? 0) + 1;
							return summary;
						},
						{},
					);

					return (
						<section className="space-y-6">
							<WizardStepHeading
								title="Revisión"
								description="Confirma la información antes de crear el equipo."
							/>
							<div
								className={cn(
									"grid gap-4",
									values.standaloneRental.enabled
										? "lg:grid-cols-3"
										: "lg:grid-cols-2",
								)}
							>
								<ReviewCard title="Equipo" onEdit={() => onEdit(0)}>
									<p className="font-medium">{values.equipment.name}</p>
									<p>{categoryName(values.equipment.categoryId)}</p>
									{values.equipment.description && (
										<p>{values.equipment.description}</p>
									)}
								</ReviewCard>
								<ReviewCard title="Unidades" onEdit={() => onEdit(1)}>
									{values.assets.length === 0 ? (
										<p className="font-medium">Sin unidades iniciales</p>
									) : (
										<>
											<p className="font-medium">
												{values.assets.length}{" "}
												{values.assets.length === 1 ? "unidad" : "unidades"}
											</p>
											{Object.entries(unitsByBranchId).map(
												([branchId, count]) => (
													<p key={branchId}>
														{branchName(branchId)}: {count}
													</p>
												),
											)}
										</>
									)}
								</ReviewCard>
								{values.standaloneRental.enabled ? (
									<ReviewCard
										title="Alquiler individual"
										onEdit={() => onEdit(2)}
									>
										<p className="font-medium">
											{values.standaloneRental.name}
										</p>
										<p>{categoryName(values.standaloneRental.categoryId)}</p>
										<p>
											{values.standaloneRental.branchIds
												.map((branchId) => branchName(branchId))
												.join(", ")}
										</p>
										<p className="text-muted-foreground text-xs">
											El precio se configura por separado.
										</p>
									</ReviewCard>
								) : null}
							</div>
						</section>
					);
				}}
			</form.Subscribe>
		);
	},
});

function ReviewCard({
	title,
	children,
	onEdit,
}: {
	title: string;
	children: ReactNode;
	onEdit: () => void;
}) {
	return (
		<article className="rounded-xl border p-4">
			<div className="mb-4 flex items-center justify-between gap-3">
				<h3 className="font-semibold">{title}</h3>
				<Button type="button" variant="ghost" size="sm" onClick={onEdit}>
					Editar
				</Button>
			</div>
			<div className="space-y-2 text-muted-foreground text-sm">{children}</div>
		</article>
	);
}
