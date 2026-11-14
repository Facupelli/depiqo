const GEOGRAPHIC_CATEGORIES = ['administrative', 'populated_place', 'postal_code', 'postcode'];
const VENUE_CATEGORIES = [
  'accommodation',
  'catering',
  'commercial',
  'education',
  'entertainment',
  'healthcare',
  'office',
  'production',
  'service',
  'sport',
];

function belongsTo(category: string, family: string): boolean {
  return category === family || category.startsWith(`${family}.`);
}

export function isSpecificDeliveryDestination(location: {
  street?: string;
  streetNumber?: string;
  name?: string;
  categories?: readonly string[];
}): boolean {
  const categories = location.categories ?? [];
  if (categories.some((category) => GEOGRAPHIC_CATEGORIES.some((family) => belongsTo(category, family)))) return false;
  if (location.street?.trim() && location.streetNumber?.trim()) return true;
  if (categories.some((category) => belongsTo(category, 'building'))) return true;
  return (
    !!location.name?.trim() &&
    categories.some((category) => VENUE_CATEGORIES.some((family) => belongsTo(category, family)))
  );
}
