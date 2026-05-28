import { type RefObject, useRef, useSyncExternalStore } from "react";

/**
 * Returns true when the observed element is intersecting the viewport.
 * Uses useSyncExternalStore to subscribe to the IntersectionObserver API —
 * an external system that lives outside React's control.
 */
export function useIsVisible<T extends Element>(): [
	RefObject<T | null>,
	boolean,
] {
	const ref = useRef<T>(null);

	const isVisible = useSyncExternalStore(
		// subscribe: wire up the observer, return cleanup
		(onStoreChange) => {
			const el = ref.current;
			if (!el) return () => {};

			const observer = new IntersectionObserver(onStoreChange, {
				threshold: 0,
			});
			observer.observe(el);
			return () => observer.disconnect();
		},
		// getSnapshot: read latest intersection state from the DOM
		() => {
			const el = ref.current;
			if (!el) return false;
			// IntersectionObserver is async by nature — we derive visibility
			// from the element's bounding rect as the synchronous snapshot.
			// This is accurate enough for show/hide decisions.
			const rect = el.getBoundingClientRect();
			return (
				rect.top < window.innerHeight &&
				rect.bottom > 0 &&
				rect.left < window.innerWidth &&
				rect.right > 0
			);
		},
		// Server rendering cannot measure the DOM, so default to hidden until
		// the client can compute the real viewport intersection state.
		() => false,
	);

	return [ref, isVisible];
}
