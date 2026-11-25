# Key rental creation retries by caller intent

Rental creation pairs an idempotency key with a canonical fingerprint of the caller's material intent. If a request is retried after an ambiguous failure, the same key and equivalent intent resolve to the original rental; reusing the key with different intent is a conflict. Do not fingerprint mutable proposals, assigned assets, generated values, or transport-only booking snapshots: those can change without the caller starting a different operation.

Fingerprint changes must preserve replay for existing records. For example, an omitted draft delivery decision stays omitted from the fingerprint rather than introducing a new default field into legacy hashes. Invalid draft pricing adjustments remain unnormalized in the fingerprint so the command can reach the existing pricing validation. When a concurrent insert loses the race, resolve the replay through the normal Prisma client only after the failed transaction has rolled back.

Storefront keeps the confirmation-attempt key in session storage across refreshes and lost responses; success or a conflict clears it. Backoffice retains the draft creation key for retries of the same submission.
