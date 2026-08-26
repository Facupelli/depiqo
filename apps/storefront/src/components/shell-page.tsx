import type { ReactNode } from "react";

export function ShellPage({
	children,
	footer,
}: {
	children: ReactNode;
	footer?: ReactNode;
}) {
	return (
		<main className="grid min-h-screen grid-rows-[1fr_auto] bg-[#efeee8] bg-[linear-gradient(rgba(23,23,19,0.055)_1px,transparent_1px),linear-gradient(90deg,rgba(23,23,19,0.055)_1px,transparent_1px)] bg-size-[32px_32px] p-6 sm:p-10 lg:p-16">
			{children}
			{footer}
		</main>
	);
}

export function ShellPanel({ children }: { children: ReactNode }) {
	return (
		<section className="w-full max-w-2xl self-center border border-[#171713] bg-[#f7f6f0]/95 p-8 shadow-[7px_7px_0_#d7d32f] sm:p-12 sm:shadow-[12px_12px_0_#d7d32f] lg:p-20">
			{children}
		</section>
	);
}

export function ShellRule({ error = false }: { error?: boolean }) {
	return (
		<div
			className={`mb-8 h-[0.3rem] w-14 ${error ? "bg-[#b6492d]" : "bg-[#d7d32f]"}`}
			aria-hidden="true"
		/>
	);
}
