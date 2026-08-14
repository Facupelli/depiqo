import { PromotionForm } from "../PromotionForm";
import { toCreatePromotionDto } from "../promotion-form.schema";
import { useCreatePromotion } from "./create-promotion.mutation";

type CreatePromotionFormProps = {
	onCancel: () => void;
	onSuccess: () => void | Promise<void>;
};

export function CreatePromotionForm({
	onCancel,
	onSuccess,
}: CreatePromotionFormProps) {
	const { mutateAsync: createPromotion, isPending } = useCreatePromotion();

	return (
		<PromotionForm
			onCancel={onCancel}
			onSubmit={async (values) => {
				await createPromotion({ body: toCreatePromotionDto(values) });
				await onSuccess();
			}}
			isPending={isPending}
			submitLabel="Crear promoción"
			pendingLabel="Creando..."
		/>
	);
}
