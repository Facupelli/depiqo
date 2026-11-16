import type { ReactNode } from "react";

export function CardHeaderIcon({ children }: { children: ReactNode }) {
	return (
		<span
			aria-hidden="true"
			className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 [&_svg]:size-4"
		>
			{children}
		</span>
	);
}
