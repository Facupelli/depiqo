import { useRef } from "react";

type ActiveCreateOrderIdempotencyKey = {
	signature: string;
	key: string;
};

type CreateOrderIdempotencyController = {
	getKeyForSignature: (signature: string) => string;
	clear: () => void;
	discard: () => void;
};

export function useCreateOrderIdempotency(): CreateOrderIdempotencyController {
	const activeKeyRef = useRef<ActiveCreateOrderIdempotencyKey | null>(null);

	return {
		getKeyForSignature(signature) {
			if (activeKeyRef.current?.signature === signature) {
				return activeKeyRef.current.key;
			}

			const key = crypto.randomUUID();
			activeKeyRef.current = { signature, key };
			return key;
		},
		clear() {
			activeKeyRef.current = null;
		},
		discard() {
			activeKeyRef.current = null;
		},
	};
}
