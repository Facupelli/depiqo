-- V2 tenant-user local authentication is represented exclusively by
-- v2_tenant_users plus v2_local_credentials. Existing identity rows are
-- intentionally discarded because they are not authentication authority.
DROP TABLE "v2_auth_identities";
