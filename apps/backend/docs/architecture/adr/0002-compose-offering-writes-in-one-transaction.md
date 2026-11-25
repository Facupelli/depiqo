# Compose offering writes in one transaction

Offering Setup owns the transaction for coordinated offering writes. Catalog, Pricing, and Asset Inventory retain ownership of their operations, but their transactional capabilities join the ambient `PrismaUnitOfWork` transaction when called by Offering Setup and open their own transaction when called independently. This keeps a failed later step from leaving a partially configured offering without making Offering Setup write another module's tables. Validation reads must use the same transaction client: the rows they validate may have been created earlier in that transaction and are not yet visible to a separate client.

The outer `Result` boundary deliberately treats a returned `Err` as a rollback, not a successful Prisma callback. It signals rollback without placing the application result on the thrown error and returns the original `Err` after rollback.

See [application service transaction rules](../../implementation-rules/application-service.md).
