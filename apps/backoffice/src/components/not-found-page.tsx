export function NotFoundPage() {
	return (
		<div className="relative flex min-h-screen flex-col items-center justify-center bg-white px-6">
			{/* Center content */}
			<div className="flex flex-col items-center text-center">
				<p className="mb-6 text-xs font-medium tracking-[0.2em] text-neutral-400 uppercase">
					Error 404
				</p>

				<h1 className="mb-4 text-5xl font-semibold tracking-tight text-neutral-900">
					Storefront Not Found.
				</h1>

				<p className="mb-12 max-w-sm text-sm leading-relaxed text-neutral-500">
					The rental portal you are looking for doesn&apos;t exist or has moved.
					Please check the URL and try again.
				</p>

				<div className="flex items-center gap-8">
					<a
						href="/"
						className="text-xs font-medium tracking-[0.15em] text-neutral-900 uppercase underline-offset-4 hover:underline"
					>
						Return to Homepage
					</a>
					<span className="h-3 w-px bg-neutral-300" aria-hidden="true" />
					<a
						href="mailto:support@portalplatform.com"
						className="text-xs font-medium tracking-[0.15em] text-neutral-900 uppercase underline-offset-4 hover:underline"
					>
						Contact Support
					</a>
				</div>
			</div>

			{/* Footer */}
			<footer className="absolute bottom-6 left-0 right-0 flex justify-center">
				<p className="text-xs text-neutral-400">
					© {new Date().getFullYear()} Portal Platform. All rights reserved.
				</p>
			</footer>
		</div>
	);
}
