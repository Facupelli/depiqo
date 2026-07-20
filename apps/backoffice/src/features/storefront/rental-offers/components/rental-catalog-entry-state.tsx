import type { GetStorefrontBranchDto } from "@repo/api-contracts";
import { Link } from "@tanstack/react-router";
import { Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BranchSelectionProps {
	branches: GetStorefrontBranchDto[];
	invalidBranchRequested: boolean;
	onSelect: (branchId: string) => void;
}

export function BranchSelection({
	branches,
	invalidBranchRequested,
	onSelect,
}: BranchSelectionProps) {
	return (
		<section className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm md:p-10">
			<div className="mb-8 flex flex-col items-center text-center">
				<div className="mb-5 flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
					<MapPin className="size-5" aria-hidden="true" />
				</div>
				<h1 className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
					Elegí una sucursal
				</h1>
				<p className="mt-3 max-w-lg text-sm leading-6 text-neutral-600 md:text-base">
					Seleccioná dónde querés retirar o recibir los equipos para ver precios
					y disponibilidad.
				</p>
			</div>

			{invalidBranchRequested && (
				<output className="mb-5 block rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
					La sucursal solicitada ya no está disponible. Elegí otra ubicación
					para continuar.
				</output>
			)}

			<div className="grid gap-3 sm:grid-cols-2">
				{branches.map((branch) => (
					<Button
						key={branch.id}
						type="button"
						variant="outline"
						className="h-auto min-h-16 justify-start gap-3 rounded-xl px-4 py-3 text-left"
						onClick={() => onSelect(branch.id)}
					>
						<Building2
							className="size-5 shrink-0 text-muted-foreground"
							aria-hidden="true"
						/>
						<span className="font-medium text-foreground">{branch.name}</span>
					</Button>
				))}
			</div>
		</section>
	);
}

export function CatalogUnavailable() {
	return (
		<section className="w-full max-w-xl rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm md:p-10">
			<div className="mx-auto mb-5 flex size-12 items-center justify-center rounded-full bg-neutral-100 text-neutral-600">
				<Building2 className="size-5" aria-hidden="true" />
			</div>
			<h1 className="text-2xl font-semibold tracking-tight text-neutral-950 md:text-3xl">
				El catálogo todavía no está disponible
			</h1>
			<p className="mx-auto mt-3 max-w-md text-sm leading-6 text-neutral-600 md:text-base">
				No hay sucursales habilitadas para recibir reservas en este momento.
			</p>
			<Button className="mt-7" variant="outline" render={<Link to="/" />}>
				Volver al inicio
			</Button>
		</section>
	);
}
