-- CreateEnum
CREATE TYPE "V2UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "V2UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "V2AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "V2PasswordAlgorithm" AS ENUM ('ARGON2ID', 'BCRYPT');

-- CreateEnum
CREATE TYPE "V2AuthAuditEventType" AS ENUM ('LOGIN_SUCCESS', 'LOGIN_FAILURE', 'LOGOUT', 'LOGOUT_ALL_DEVICES', 'PASSWORD_RESET_REQUESTED', 'PASSWORD_RESET_COMPLETED', 'PASSWORD_CHANGED', 'GOOGLE_LINKED', 'GOOGLE_UNLINKED', 'ACCOUNT_CREATED', 'SESSION_INVALIDATED');

-- CreateTable
CREATE TABLE "v2_tenant_users" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "email_verified_at" TIMESTAMP(3),
    "name" TEXT,
    "avatar_url" TEXT,
    "role" "V2UserRole" NOT NULL DEFAULT 'USER',
    "status" "V2UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "session_version" INTEGER NOT NULL DEFAULT 1,
    "password_changed_at" TIMESTAMP(3),
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_tenant_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_auth_identities" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" "V2AuthProvider" NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "profile" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_local_credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "password_algorithm" "V2PasswordAlgorithm" NOT NULL DEFAULT 'ARGON2ID',
    "password_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "v2_local_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_password_reset_tokens" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "request_ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "v2_auth_audit_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "type" "V2AuthAuditEventType" NOT NULL,
    "ip" TEXT,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "v2_auth_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenant_users_email_key" ON "v2_tenant_users"("email");

-- CreateIndex
CREATE INDEX "v2_tenant_users_status_idx" ON "v2_tenant_users"("status");

-- CreateIndex
CREATE INDEX "v2_tenant_users_role_idx" ON "v2_tenant_users"("role");

-- CreateIndex
CREATE INDEX "v2_tenant_users_created_at_idx" ON "v2_tenant_users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "v2_tenant_users_email_tenant_id_key" ON "v2_tenant_users"("email", "tenant_id");

-- CreateIndex
CREATE INDEX "v2_auth_identities_user_id_idx" ON "v2_auth_identities"("user_id");

-- CreateIndex
CREATE INDEX "v2_auth_identities_provider_idx" ON "v2_auth_identities"("provider");

-- CreateIndex
CREATE INDEX "v2_auth_identities_email_idx" ON "v2_auth_identities"("email");

-- CreateIndex
CREATE UNIQUE INDEX "v2_auth_identities_provider_provider_account_id_key" ON "v2_auth_identities"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_auth_identities_user_id_provider_key" ON "v2_auth_identities"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "v2_local_credentials_user_id_key" ON "v2_local_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "v2_local_credentials_password_hash_key" ON "v2_local_credentials"("password_hash");

-- CreateIndex
CREATE UNIQUE INDEX "v2_password_reset_tokens_token_hash_key" ON "v2_password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "v2_password_reset_tokens_user_id_idx" ON "v2_password_reset_tokens"("user_id");

-- CreateIndex
CREATE INDEX "v2_password_reset_tokens_expires_at_idx" ON "v2_password_reset_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "v2_password_reset_tokens_used_at_idx" ON "v2_password_reset_tokens"("used_at");

-- CreateIndex
CREATE INDEX "v2_auth_audit_events_user_id_idx" ON "v2_auth_audit_events"("user_id");

-- CreateIndex
CREATE INDEX "v2_auth_audit_events_type_idx" ON "v2_auth_audit_events"("type");

-- CreateIndex
CREATE INDEX "v2_auth_audit_events_created_at_idx" ON "v2_auth_audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "v2_auth_identities" ADD CONSTRAINT "v2_auth_identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "v2_tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_local_credentials" ADD CONSTRAINT "v2_local_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "v2_tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_password_reset_tokens" ADD CONSTRAINT "v2_password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "v2_tenant_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "v2_auth_audit_events" ADD CONSTRAINT "v2_auth_audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "v2_tenant_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
