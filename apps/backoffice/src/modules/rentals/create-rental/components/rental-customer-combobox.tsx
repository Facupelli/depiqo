import { Field, FieldLabel } from "@repo/ui/components/field";
import { RentalCustomerSelector } from "@/modules/rentals/customer-selection/rental-customer-selector";
import { withForm } from "@/shared/contexts/form.context";
import { createDraftRentalComposerDefaultValues } from "../create-draft-rental-composer.schema";

export const RentalCustomerCombobox = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	render: function Render({ form }) {
		return (
			<form.Field name="rentalCustomerId">
				{(field) => (
					<Field>
						<FieldLabel>Cliente</FieldLabel>
						<RentalCustomerSelector
							value={field.state.value}
							onValueChange={field.handleChange}
						/>
					</Field>
				)}
			</form.Field>
		);
	},
});
