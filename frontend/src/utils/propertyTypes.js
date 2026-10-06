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
export const PROPERTY_TYPES = [
  'Good Class Bungalow (GCB)',
  'Detached/Bungalow',
  'Semi-Detached',
  'Inter-Terrace',
  'Corner Terrace',
  'Penthouse'
];
