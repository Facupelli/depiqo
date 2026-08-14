ALTER TABLE "equipment_type_accessory_defaults"
  ADD CONSTRAINT "equipment_type_accessory_defaults_quantity_positive"
  CHECK ("quantity" > 0),
  ADD CONSTRAINT "equipment_type_accessory_defaults_no_self_reference"
  CHECK ("equipment_type_id" <> "accessory_equipment_type_id");
