import type { OrderAccessoryPreparationResponseDto } from "@repo/schemas";
import { useForm, useStore } from "@tanstack/react-form";
import { useState } from "react";
import { toast } from "sonner";
import { ProblemDetailsError } from "@/shared/errors";
import { useSaveOrderAccessoryPreparation } from "../accessory-preparation.queries";
import {
	type AccessoryPreparationAccessoryFormValues,
	type AccessoryPreparationFormValues,
	accessoryPreparationFormSchema,
	accessoryPreparationToFormValues,
	toSaveOrderAccessoryPreparationDto,
} from "../schemas/accessory-preparation-form.schema";

type UseAccessoryPreparationFormInput = {
	orderId: string;
	preparation: OrderAccessoryPreparationResponseDto;
};

type AccessoryUpdater = (
	accessory: AccessoryPreparationAccessoryFormValues,
) => AccessoryPreparationAccessoryFormValues;

export function useAccessoryPreparationForm({
	orderId,
	preparation,
}: UseAccessoryPreparationFormInput) {
	const [submitErrorMessage, setSubmitErrorMessage] = useState<string | null>(
		null,
	);
	const { mutateAsync: savePreparation, isPending } =
		useSaveOrderAccessoryPreparation();
	const defaultValues = accessoryPreparationToFormValues(preparation);

	const form = useForm({
		defaultValues,
		validators: {
			onSubmit: accessoryPreparationFormSchema,
		},
		onSubmit: async ({ value }) => {
			try {
				setSubmitErrorMessage(null);
				await savePreparation({
					params: { orderId },
					dto: toSaveOrderAccessoryPreparationDto(value),
				});
				toast.success("Preparacion de accesorios guardada");
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					setSubmitErrorMessage(error.problemDetails.detail ?? error.message);
					return;
				}

				throw error;
			}
		},
	});

	const values = useStore(form.store, (state) => state.values);

	function updateAccessory(
		itemIndex: number,
		accessoryIndex: number,
		updater: AccessoryUpdater,
	) {
		form.setFieldValue("items", (items) =>
			items.map((item, currentItemIndex) => {
				if (currentItemIndex !== itemIndex) {
					return item;
				}

				return {
					...item,
					accessories: item.accessories.map((accessory, currentAccessoryIndex) =>
						currentAccessoryIndex === accessoryIndex
							? updater(accessory)
							: accessory,
					),
				};
			}),
		);
	}

	function setAccessorySelected(
		itemIndex: number,
		accessoryIndex: number,
		selected: boolean,
	) {
		updateAccessory(itemIndex, accessoryIndex, (accessory) => ({
			...accessory,
			selected,
		}));
	}

	function setAccessoryQuantity(
		itemIndex: number,
		accessoryIndex: number,
		quantity: number,
	) {
		updateAccessory(itemIndex, accessoryIndex, (accessory) => ({
			...accessory,
			quantity: Math.max(1, quantity),
		}));
	}

	function buildPayload(valuesToSubmit: AccessoryPreparationFormValues = values) {
		return toSaveOrderAccessoryPreparationDto(valuesToSubmit);
	}

	return {
		form,
		values,
		isPending,
		submitErrorMessage,
		buildPayload,
		setAccessorySelected,
		setAccessoryQuantity,
	};
}

export type AccessoryPreparationForm = ReturnType<
	typeof useAccessoryPreparationForm
>;
