import type { ReactNode } from "react";

function PreviewPanel({ children }: { children: ReactNode }) {
	return (
		<div className="w-full max-w-[330px] rounded-[9px] border border-[#e7ebf2] bg-white p-[15px] text-xs shadow-[0_6px_20px_rgba(19,49,86,0.045)]">
			{children}
		</div>
	);
}

export function KitPreview() {
	return (
		<PreviewPanel>
			<div className="flex items-center justify-between font-bold">
				Kit de filmación
				<span className="rounded-[5px] bg-[#eef4ff] px-[7px] py-1 text-[10px] text-[#2364d9]">
					Kit
				</span>
			</div>
			<p className="mb-2.5 mt-[7px] text-[#65758b]">Incluye</p>
			<div className="grid grid-cols-3 gap-[7px]">
				{[
					{ label: "Cámara ×1", image: "kit-camera" },
					{ label: "Trípode ×1", image: "kit-tripod" },
					{ label: "Luces ×2", image: "kit-lights" },
				].map(({ label, image }) => (
					<div
						key={label}
						className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-md border border-[#e5ebf6] bg-[#f7faff] text-center text-[#526580]"
					>
						<img
							src={`/marketing/${image}.svg`}
							width={24}
							height={24}
							alt=""
							loading="lazy"
							className="size-6"
						/>
						{label}
					</div>
				))}
			</div>
		</PreviewPanel>
	);
}

export function PricingPreview() {
	return (
		<PreviewPanel>
			<p className="mb-2.5 font-bold">Ejemplo · Tarifa diaria</p>
			{[
				["1 día", "€ 68"],
				["3 días", "€ 182"],
				["7 días", "€ 375"],
			].map(([duration, price]) => (
				<div
					key={duration}
					className="flex justify-between border-b border-[#edf1f6] py-2.5 text-[11px] text-[#4a596f] last:border-0"
				>
					<span>{duration}</span>
					<strong className="text-[#225ac5]">{price}</strong>
				</div>
			))}
		</PreviewPanel>
	);
}

export function EditPreview() {
	return (
		<PreviewPanel>
			<p className="mb-[13px] font-bold">Editar alquiler</p>
			<p className="mb-2.5 mt-[7px] text-[#65758b]">Fechas del alquiler</p>
			<div className="flex items-center gap-2.5 text-center text-[11px]">
				<span className="flex-1 rounded-md bg-[#f4f7fb] px-2 py-[15px] text-[#586a83]">
					12 – 15 nov
				</span>
				<span className="text-primary">→</span>
				<span className="flex-1 rounded-md border border-[#abc8ff] bg-[#edf4ff] px-2 py-[15px] text-primary">
					18 – 21 nov
				</span>
			</div>
			<p className="mt-[15px] text-[10px] text-[#248761]">
				✓ Cambio de fechas guardado
			</p>
		</PreviewPanel>
	);
}

export function ContractPreview() {
	return (
		<div className="min-h-[164px] w-[135px] rounded-[5px] border border-[#e4eaf2] bg-white p-[15px] text-[10px] shadow-[0_8px_20px_rgba(16,41,86,0.08)]">
			<p className="font-bold text-primary">◆ DEPIQO</p>
			<p className="mt-2.5 font-bold">Contrato de alquiler</p>
			<div className="my-[9px] h-[5px] rounded-sm bg-[#e6ebf2]" />
			<div className="my-[9px] h-[5px] rounded-sm bg-[#e6ebf2]" />
			<div className="my-[9px] h-[5px] w-[55%] rounded-sm bg-[#e6ebf2]" />
			<div className="h-2.5" />
			<div className="my-[9px] h-[5px] rounded-sm bg-[#e6ebf2]" />
			<p className="-rotate-7 text-right font-[cursive] text-xl text-primary">
				Firma
			</p>
		</div>
	);
}
