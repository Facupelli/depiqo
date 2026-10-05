# Follow-up: identity-document upload and inline-content hardening

Not part of Backoffice Customer Profile Ticket 06. The current Storefront Better Upload flow checks browser-declared MIME types before issuing a direct-to-R2 upload URL; it does not verify the uploaded bytes. The document reader preserves the existing inline presentation and relies on stored R2 content type, not file-content validation.

Investigate a trusted post-upload or alternative processing step that validates uploaded bytes before inline rendering. Evaluate canonical key extensions, file signatures/type validation, legacy objects and whether direct-to-R2 uploads remain appropriate. Do not treat a browser-declared MIME type or filename as proof of file content. Define the migration/compatibility policy for existing customer documents before implementation.
