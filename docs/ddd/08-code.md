Bounded Contexts

Rental Commitment
Catalog
Asset Inventory
Pricing
Tenant Management
Contracts
Notifications

---

Rental, not Order
Rental Request, not Pending Order when customer-created
Draft Rental, not Draft Order
Confirmed Rental, not Confirmed Order
Prepared Rental, not Prepared Order
Rental Customer, not Customer
Branch, not Location
Equipment Type, not Equipment when referring to catalog/model
Asset, for physical unit
Combo, if that is the business/user term
Accessory Type, for accessory definition
Accessory Asset, for physical accessory unit
Selected Accessory, for accessory included in a rental
Asset Block, for no-overlap reservation record
Price Snapshot, for preserved price breakdown/result

---

Order → Rental
Location → Branch
Customer → Rental Customer
Equipment → Equipment Type when you mean the catalog/model

---

src/
  modules/
    rental-commitment/
    catalog/
    asset-inventory/
    pricing/
    tenant-management/
    contracts/
    notifications/


---
modules/
  auth
  billing-unit
  catalog
  customer
  document-signing
  internal (resolving the tenant from domains and subdomains)
  inventory
  notifications
  object-storage
  order
  pricing
  shared
  tenant
  users
