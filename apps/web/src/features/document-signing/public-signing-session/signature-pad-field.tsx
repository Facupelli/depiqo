import { RotateCcw } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import SignaturePad from "signature_pad";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SignaturePadFieldProps = {
	id?: string;
	label?: string;
	description?: string | null;
	clearLabel?: string;
	value: string | null | undefined;
	disabled?: boolean;
	isInvalid?: boolean;
	className?: string;
	onChange: (value: string | null) => void;
};

export function SignaturePadField({
	id,
	label = "Firma",
	description = "Dibuja tu firma dentro del recuadro.",
	clearLabel = "Limpiar",
	value,
	disabled = false,
	isInvalid = false,
	className,
	onChange,
}: SignaturePadFieldProps) {
	const generatedId = useId();
	const canvasId = id ?? generatedId;
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const signaturePadRef = useRef<SignaturePad | null>(null);
	const onChangeRef = useRef(onChange);
	const currentValueRef = useRef<string | null>(value ?? null);

	onChangeRef.current = onChange;

	useEffect(() => {
		const canvas = canvasRef.current;

		if (!canvas) {
			return;
		}

		const signaturePad = new SignaturePad(canvas, {
			backgroundColor: "rgb(255, 255, 255)",
			minWidth: 0.8,
			maxWidth: 2.4,
			penColor: "rgb(23, 23, 23)",
			throttle: 8,
		});

		signaturePadRef.current = signaturePad;

		const resizeCanvas = () => {
			const ratio = Math.max(window.devicePixelRatio || 1, 1);
			const { width, height } = canvas.getBoundingClientRect();
			const pointGroups = signaturePad.toData();

			canvas.width = Math.max(Math.floor(width * ratio), 1);
			canvas.height = Math.max(Math.floor(height * ratio), 1);
			canvas.getContext("2d")?.scale(ratio, ratio);

			if (pointGroups.length > 0) {
				signaturePad.fromData(pointGroups, { clear: true });
				return;
			}

			signaturePad.clear();
		};

		const emitSignature = () => {
			const nextValue = signaturePad.isEmpty()
				? null
				: signaturePad.toDataURL("image/png");

			currentValueRef.current = nextValue;
			onChangeRef.current(nextValue);
		};

		const resizeObserver = new ResizeObserver(resizeCanvas);
		resizeObserver.observe(canvas);
		resizeCanvas();

		if (currentValueRef.current) {
			void signaturePad.fromDataURL(currentValueRef.current);
		}

		signaturePad.addEventListener("endStroke", emitSignature);

		return () => {
			resizeObserver.disconnect();
			signaturePad.removeEventListener("endStroke", emitSignature);
			signaturePad.off();
			signaturePadRef.current = null;
		};
	}, []);

	useEffect(() => {
		const signaturePad = signaturePadRef.current;

		if (!signaturePad) {
			return;
		}

		if (disabled) {
			signaturePad.off();
			return;
		}

		signaturePad.on();
	}, [disabled]);

	useEffect(() => {
		const signaturePad = signaturePadRef.current;
		const nextValue = value ?? null;

		if (!signaturePad || currentValueRef.current === nextValue) {
			return;
		}

		currentValueRef.current = nextValue;

		if (!nextValue) {
			signaturePad.clear();
			return;
		}

		void signaturePad.fromDataURL(nextValue);
	}, [value]);

	const handleClear = () => {
		const signaturePad = signaturePadRef.current;

		if (!signaturePad || disabled) {
			return;
		}

		signaturePad.clear();
		currentValueRef.current = null;
		onChange(null);
	};

	return (
		<div className={cn("space-y-2", className)}>
			<div className="flex items-start justify-between gap-3">
				<div className="space-y-1">
					<label
						htmlFor={canvasId}
						className="font-semibold text-xl text-neutral-950 leading-none sm:text-2xl"
					>
						{label}
					</label>
					{description ? (
						<p className="text-xs leading-5 text-neutral-500">{description}</p>
					) : null}
				</div>

				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleClear}
					disabled={disabled}
					className="rounded-none border border-neutral-950 bg-white"
				>
					<RotateCcw className="size-3.5" aria-hidden="true" />
					{clearLabel}
				</Button>
			</div>

			<div
				className={cn(
					"overflow-hidden rounded-xl border-2 bg-white transition-colors",
					isInvalid ? "border-destructive" : "border-neutral-950",
					disabled && "opacity-60",
				)}
			>
				<canvas
					id={canvasId}
					ref={canvasRef}
					aria-invalid={isInvalid}
					className="block h-36 w-full touch-none bg-white sm:h-44"
				/>
			</div>
		</div>
	);
}
