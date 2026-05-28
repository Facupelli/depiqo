import { Field, FieldLabel } from "@/components/ui/field";
import { withForm } from "@/shared/contexts/form.context";
import { RentalCustomerSelector } from "@/v2/features/tenant-management/customer/components/rental-customer-selector";
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
