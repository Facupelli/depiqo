import { Button } from "@repo/ui/components/button";
import { Minus, Plus } from "lucide-react";

interface QuantityStepperProps {
	value: number;
	min?: number;
	max?: number | null;
	disabled?: boolean;
	onChange: (value: number) => void;
}

export function QuantityStepper({
	value,
	min = 1,
	max = null,
	disabled = false,
	onChange,
}: QuantityStepperProps) {
	const canIncrease = max === null || value < max;

	return (
		<div className="inline-flex items-center gap-2">
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-7"
				disabled={disabled || value <= min}
				onClick={() => onChange(Math.max(value - 1, min))}
				aria-label="Quitar una unidad"
			>
				<Minus className="size-3.5" />
			</Button>
			<span className="min-w-8 text-center font-medium text-sm tabular-nums">
				{value}
			</span>
			<Button
				type="button"
				variant="outline"
				size="icon"
				className="size-7"
				disabled={disabled || !canIncrease}
				onClick={() =>
					onChange(max === null ? value + 1 : Math.min(value + 1, max))
				}
				aria-label="Agregar una unidad"
			>
				<Plus className="size-3.5" />
			</Button>
		</div>
	);
}
