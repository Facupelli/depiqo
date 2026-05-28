import { Field, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";
import { withForm } from "@/shared/contexts/form.context";
import { createRatePlanFormDefaultValues } from "../create-rate-plan/create-rate-plan.schema";

export const RatePlanActiveField = withForm({
	defaultValues: createRatePlanFormDefaultValues(),
	render: function Render({ form }) {
		return (
			<form.Field name="isActive">
				{(field) => (
					<Field className="md:col-span-2">
						<div className="flex items-center justify-between rounded-lg border p-4">
							<div>
								<FieldLabel>Plan activo</FieldLabel>
								<p className="mt-1 text-muted-foreground text-sm">
									Los planes activos pueden usarse para nuevas tarifas.
								</p>
							</div>
							<Switch
								checked={field.state.value}
								onCheckedChange={(checked) => field.handleChange(checked)}
								aria-label="Alternar plan activo"
							/>
						</div>
					</Field>
				)}
			</form.Field>
		);
	},
});
