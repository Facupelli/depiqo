interface WizardStepHeadingProps {
	title: string;
	description: string;
}

export function WizardStepHeading({
	title,
	description,
}: WizardStepHeadingProps) {
	return (
		<div>
			<h2 className="font-semibold text-xl">{title}</h2>
			<p className="mt-1 text-muted-foreground text-sm">{description}</p>
		</div>
	);
}
