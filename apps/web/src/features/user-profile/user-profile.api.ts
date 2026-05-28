import {
	type CreateUserProfileDto,
	createUserProfileSchema,
	type ProblemDetails,
	type UpdateUserProfileDto,
	type UserProfileResponseDto,
	updateUserProfileSchema,
	userProfileResponseSchema,
} from "@repo/schemas";
import { createServerFn } from "@tanstack/react-start";
import { authenticatedApiFetch as apiFetch } from "@/lib/api-auth";
import { ProblemDetailsError } from "@/shared/errors";

const apiUrl = "/users";

type CreateUserProfileVariables = {
	userId: string;
	dto: CreateUserProfileDto;
};

type UpdateUserProfileVariables = {
	userId: string;
	dto: UpdateUserProfileDto;
};

export const getUserProfile = createServerFn({ method: "GET" })
	.inputValidator((userId: string) => userId)
	.handler(
		async ({
			data: userId,
		}): Promise<UserProfileResponseDto | { error: ProblemDetails }> => {
			try {
				const result = await apiFetch<UserProfileResponseDto>(
					`${apiUrl}/${userId}/profile`,
					{
						method: "GET",
					},
				);

				return userProfileResponseSchema.parse(result);
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					return { error: error.problemDetails };
				}

				throw error;
			}
		},
	);

export const createUserProfile = createServerFn({ method: "POST" })
	.inputValidator((data: CreateUserProfileVariables) => ({
		userId: data.userId,
		dto: createUserProfileSchema.parse(data.dto),
	}))
	.handler(
		async ({
			data: { userId, dto },
		}): Promise<{ id: string } | { error: ProblemDetails }> => {
			try {
				const result = await apiFetch<{ id: string }>(
					`${apiUrl}/${userId}/profile`,
					{
						method: "POST",
						body: dto,
					},
				);

				return result;
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					return { error: error.problemDetails };
				}

				throw error;
			}
		},
	);

export const updateUserProfile = createServerFn({ method: "POST" })
	.inputValidator((data: UpdateUserProfileVariables) => ({
		userId: data.userId,
		dto: updateUserProfileSchema.parse(data.dto),
	}))
	.handler(
		async ({
			data: { userId, dto },
		}): Promise<void | { error: ProblemDetails }> => {
			try {
				await apiFetch(`${apiUrl}/${userId}/profile`, {
					method: "PATCH",
					body: dto,
				});
			} catch (error) {
				if (error instanceof ProblemDetailsError) {
					return { error: error.problemDetails };
				}

				throw error;
			}
		},
	);
