import { Button } from "@repo/ui/components/button";
import { RotateCcw } from "lucide-react";
import { useEffect, useId, useRef } from "react";
import SignaturePad from "signature_pad";

type SignaturePadFieldProps = {
	id?: string;
	value: string;
	disabled?: boolean;
	isInvalid?: boolean;
	onChange: (value: string) => void;
};

export function SignaturePadField({
	id,
	value,
	disabled = false,
	isInvalid = false,
	onChange,
}: SignaturePadFieldProps) {
	const generatedId = useId();
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const signaturePadRef = useRef<SignaturePad | null>(null);
	const onChangeRef = useRef(onChange);
	const currentValueRef = useRef(value);
	const restoreValueRef = useRef<() => void>(() => {});

	onChangeRef.current = onChange;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const signatureCanvas = canvas;
		const signaturePad = new SignaturePad(signatureCanvas, {
			backgroundColor: "rgb(255, 255, 255)",
			minWidth: 0.8,
			maxWidth: 2.4,
			penColor: "rgb(23, 23, 23)",
			throttle: 8,
		});
		signaturePadRef.current = signaturePad;

		let isDisposed = false;
		let restorationQueue = Promise.resolve();

		function queueRestore() {
			restorationQueue = restorationQueue
				.catch(() => undefined)
				.then(async () => {
					if (isDisposed || signaturePadRef.current !== signaturePad) return;

					const valueToRestore = currentValueRef.current;
					signaturePad.clear();
					if (!valueToRestore) return;

					await signaturePad.fromDataURL(valueToRestore);

					if (
						isDisposed ||
						signaturePadRef.current !== signaturePad ||
						currentValueRef.current === valueToRestore
					) {
						return;
					}

					queueRestore();
				});
		}

		restoreValueRef.current = queueRestore;

		function resizeCanvas() {
			const ratio = Math.max(window.devicePixelRatio || 1, 1);
			const { width, height } = signatureCanvas.getBoundingClientRect();

			signatureCanvas.width = Math.max(Math.floor(width * ratio), 1);
			signatureCanvas.height = Math.max(Math.floor(height * ratio), 1);
			signatureCanvas.getContext("2d")?.scale(ratio, ratio);
			queueRestore();
		}

		function emitSignature() {
			const nextValue = signaturePad.isEmpty()
				? ""
				: signaturePad.toDataURL("image/png");
			currentValueRef.current = nextValue;
			onChangeRef.current(nextValue);
		}

		const resizeObserver = new ResizeObserver(resizeCanvas);
		resizeObserver.observe(signatureCanvas);
		resizeCanvas();
		signaturePad.addEventListener("endStroke", emitSignature);

		return () => {
			isDisposed = true;
			resizeObserver.disconnect();
			signaturePad.removeEventListener("endStroke", emitSignature);
			signaturePad.off();
			if (restoreValueRef.current === queueRestore) {
				restoreValueRef.current = () => {};
			}
			signaturePadRef.current = null;
		};
	}, []);

	useEffect(() => {
		const signaturePad = signaturePadRef.current;
		if (!signaturePad) return;
		if (disabled) {
			signaturePad.off();
			return;
		}
		signaturePad.on();
	}, [disabled]);

	useEffect(() => {
		if (currentValueRef.current === value) return;

		currentValueRef.current = value;
		restoreValueRef.current();
	}, [value]);

	function handleClear() {
		const signaturePad = signaturePadRef.current;
		if (!signaturePad || disabled) return;
		signaturePad.clear();
		currentValueRef.current = "";
		onChange("");
	}

	const canvasId = id ?? generatedId;
	return (
		<div className="space-y-2">
			<div className="flex items-start justify-between gap-3">
				<div>
					<label className="text-lg font-semibold" htmlFor={canvasId}>
						Tu firma
					</label>
					<p className="text-sm text-neutral-600">
						Dibuja tu firma dentro del recuadro.
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={handleClear}
					disabled={disabled}
				>
					<RotateCcw className="size-3.5" aria-hidden="true" />
					Redibujar
				</Button>
			</div>
			<div
				className={`overflow-hidden rounded-lg border-2 bg-white ${
					isInvalid ? "border-destructive" : "border-neutral-900"
				} ${disabled ? "opacity-60" : ""}`}
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
