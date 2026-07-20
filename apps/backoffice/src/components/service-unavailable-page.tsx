export function ServiceUnavailablePage() {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6">
			{/* Center content */}
			<div className="flex flex-col items-center text-center">
				{/* X icon in a bordered square */}
				<div className="mb-8 flex h-16 w-16 items-center justify-center border border-neutral-300">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
						className="text-neutral-700"
						aria-hidden="true"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</div>

				<h1 className="mb-4 text-3xl font-semibold tracking-tight text-neutral-900">
					System Temporarily Unavailable
				</h1>

				<p className="mb-10 max-w-sm text-sm leading-relaxed text-neutral-500">
					We&apos;re experiencing a brief service interruption while connecting
					to your portal. Our team has been notified. Please try refreshing in a
					few moments.
				</p>

				<div className="flex items-center gap-4">
					<button
						onClick={() => window.location.reload()}
						className="bg-neutral-900 px-6 py-2.5 text-xs font-medium tracking-[0.15em] text-white uppercase transition-colors hover:bg-neutral-700"
					>
						Try Again
					</button>
				</div>
			</div>
		</div>
	);
}
