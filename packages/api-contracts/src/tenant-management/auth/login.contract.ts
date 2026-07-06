import { z } from "zod";

import type { ApiContract } from "../../api-contract";

export const LoginBodySchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const AuthActorTypeSchema = z.enum(["TENANT_USER", "TENANT_CUSTOMER"]);

export const AuthUserSchema = z.object({
  actorType: z.literal("TENANT_USER"),
  id: z.string(),
  tenantId: z.string(),
  email: z.email(),
  name: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: z.enum(["USER", "ADMIN"]),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED"]),
  emailVerifiedAt: z.string().datetime().nullable(),
  sessionVersion: z.number().int(),
});

export const AuthCustomerSchema = z.object({
  actorType: z.literal("TENANT_CUSTOMER"),
  id: z.string(),
  tenantId: z.string(),
  email: z.email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().nullable(),
  avatarUrl: z.string().url().nullable(),
  onboardingStatus: z.enum(["NOT_STARTED", "PENDING", "APPROVED", "REJECTED"]),
  emailVerifiedAt: z.string().datetime().nullable(),
  sessionVersion: z.number().int(),
});

export const AuthActorSchema = z.discriminatedUnion("actorType", [
  AuthUserSchema,
  AuthCustomerSchema,
]);

export const LoginResponseSchema = z.object({
  user: AuthUserSchema,
  csrfToken: z.string().min(1),
});

export type LoginBodyDto = z.infer<typeof LoginBodySchema>;
export type AuthActorTypeDto = z.infer<typeof AuthActorTypeSchema>;
export type AuthUserDto = z.infer<typeof AuthUserSchema>;
export type AuthCustomerDto = z.infer<typeof AuthCustomerSchema>;
export type AuthActorDto = z.infer<typeof AuthActorSchema>;
export type LoginResponseDto = z.infer<typeof LoginResponseSchema>;

export const loginContract = {
  method: "POST",
  path: "/auth/login",
  body: LoginBodySchema,
  response: LoginResponseSchema,
} satisfies ApiContract<undefined, undefined, undefined, typeof LoginBodySchema, typeof LoginResponseSchema>;
