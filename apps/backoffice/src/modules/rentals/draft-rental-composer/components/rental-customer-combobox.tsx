import { Field, FieldLabel } from "@repo/ui/components/field";
import {
	type RentalCustomerDisplayFacts,
	RentalCustomerSelector,
} from "@/modules/rentals/customer-selection/rental-customer-selector";
import { withForm } from "@/shared/contexts/form.context";
import { createDraftRentalComposerDefaultValues } from "../draft-rental-composer.schema";

export const RentalCustomerCombobox = withForm({
	defaultValues: createDraftRentalComposerDefaultValues(),
	props: {
		initialCustomer: undefined as RentalCustomerDisplayFacts | undefined,
	},
	render: function Render({ form, initialCustomer }) {
		return (
			<form.Field name="rentalCustomerId">
				{(field) => (
					<Field>
						<FieldLabel htmlFor={field.name}>Cliente</FieldLabel>
						<RentalCustomerSelector
							id={field.name}
							value={field.state.value}
							initialSelectedCustomer={initialCustomer}
							onValueChange={field.handleChange}
						/>
					</Field>
				)}
			</form.Field>
		);
	},
});
