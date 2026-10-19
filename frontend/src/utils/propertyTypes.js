// THE one canonical list of property-type labels for the whole app.
//
// Buyer-listing matching is EXACT string equality between a listing's
// property type(s) and a buyer's wanted types -- if a label differs by even a
// single character or space, a real match silently fails and the agent never
// sees it. To make that class of bug impossible, every place that shows a
// property-type picker imports THIS list instead of keeping its own copy:
//   - New Listing multi-select (pages/NewListing.js)
//   - Buyer wanted-types chips (components/BuyerFormModal.js)
//   - Seller form dropdown (components/SellerFormModal.js)
//   - Pricing Reports filter (pages/PricingReports.js)
//
// These are the REAL, match-relevant labels only. Forms that need an empty
// "not chosen" placeholder (the seller form's "Not Yet Known", the pricing
// filter's "Any landed type") prepend their own '' option locally -- the
// placeholder is a UI affordance, never a matchable value, so it does not
// belong in this shared source of truth.
//
// Do NOT rename, reorder-for-meaning, or reword any label here without a
// matching backend/data migration -- existing buyers and listings already
// hold these exact strings.
//
// The list is two wings: PRESTIGE (landed, plus Penthouse as before) and HOME
// (condo family -- NestList Home phase 1). The HOME labels are the backend's
// canonical strings, byte for byte; buyer matching depends on them.
export const PRESTIGE_TYPES = [
  'Good Class Bungalow (GCB)',
  'Detached/Bungalow',
  'Semi-Detached',
  'Inter-Terrace',
  'Corner Terrace',
  'Penthouse'
];

export const CONDO_FAMILY_TYPES = [
  'Condominium',
  'Executive Condominium (EC)',
  'Apartment'
];

export const PROPERTY_TYPES = [...PRESTIGE_TYPES, ...CONDO_FAMILY_TYPES];

// ---------------------------------------------------------------------------
// Type-family helpers. These read free text defensively (older listings, or a
// Smart Fill label that is not one of ours) and never throw.
//
// Condo-family kind of ONE label: 'ec' | 'condo' | 'apartment' | ''.
// EC is checked BEFORE generic condo, because "Executive Condominium" contains
// "condo". Mirrors the backend's is_strata_type token list.
export function condoKind(type) {
  const t = String(type || '').trim().toLowerCase();
  if (!t) return '';
  if (t === 'ec' || t.includes('executive condominium') || t.includes('(ec)')) return 'ec';
  if (t.includes('condo')) return 'condo';
  if (t.includes('apartment') || t.includes('walk-up') || t.includes('walkup')) return 'apartment';
  return '';
}

export function isCondoFamilyType(type) {
  return condoKind(type) !== '';
}

// Landed / Prestige: one of the PRESTIGE_TYPES labels, or an older free-text
// landed label. Penthouse stays on the Prestige side, as it always has.
export function isPrestigeType(type) {
  const t = String(type || '').trim();
  if (!t) return false;
  if (PRESTIGE_TYPES.includes(t)) return true;
  if (isCondoFamilyType(t)) return false;
  const low = t.toLowerCase();
  return ['bungalow', 'gcb', 'good class', 'detached', 'terrace', 'penthouse', 'landed'].some(k => low.includes(k));
}

// The listing's types as a clean list: property_types[] when present, else
// the single property_type. Works on a listing row or a form object.
export function listingTypes(listing) {
  if (!listing) return [];
  const list = Array.isArray(listing.property_types) ? listing.property_types.filter(Boolean) : [];
  if (list.length) return list;
  return listing.property_type ? [listing.property_type] : [];
}

// Which caption/hashtag family a listing belongs to:
//   'prestige'  -- any landed/Prestige type present (even if a condo type is too)
//   'ec' | 'condo' | 'apartment' -- the FIRST condo-family type decides
//   'neutral'   -- blank or unrecognised: the Home neutral set, NEVER Prestige
export function listingWing(listing) {
  const types = listingTypes(listing);
  if (types.some(isPrestigeType)) return 'prestige';
  for (const t of types) {
    const k = condoKind(t);
    if (k) return k;
  }
  return 'neutral';
}

// True when the listing is condo-family ONLY (no landed type at all) -- the
// case where land size / plot / storeys / site coverage do not apply.
export function isCondoOnly(listing) {
  const types = listingTypes(listing);
  return types.length > 0 && types.some(isCondoFamilyType) && !types.some(isPrestigeType);
}
