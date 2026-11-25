# Review invoice edits against a fixed version

Backoffice refreshes the invoice when an edit or removal dialog opens and keeps that version as the basis for the user's decision. Background updates can block submission, but must not replace the reviewed version or discard the user's edits. If a write loses a version race, refresh the cached record for the next review without rebasing or retrying the failed write against a version the user did not review.
