# Serialize offer publication on the parent item

Catalog serializes offer creation and publication edits with item archive and restore by locking the tenant-scoped Rentable Item row before using its lifecycle state to read or change offer publication state. Locking only individual offers would not coordinate an archive or restore with the creation of an offer that has no row to lock yet. All of these writes must acquire the parent lock first so the first-publication date reflects the first time a visible offer belongs to an unarchived item.

The database uniqueness constraint remains the final guard against duplicate branch offers; the application pre-check alone does not establish uniqueness.

Creating a branch offer does not launch it by default. The caller composing the priced offer explicitly requests launch, so preparing an offer does not by itself expose it or make it rentable.
