export function PoweredByFooter() {
	return (
		<footer className="mt-auto border-t bg-white">
			<div className="container mx-auto px-4 py-4 flex justify-end">
				<p className="text-xs text-muted-foreground">
					<a
						href="https://www.depiqo.com"
						target="_blank"
						rel="noopener noreferrer"
						className="hover:text-foreground transition-colors underline-offset-2 hover:underline"
					>
						Powered by Depiqo
					</a>
				</p>
			</div>
		</footer>
	);
}
