// Formats a price (raw number, or a comma-formatted string like "10,280,000")
// as millions, e.g. 10280000 -> "10.28M", 28000000 -> "28M". Returns the
// original value unchanged if it can't be parsed as a number.
export function formatPriceM(price) {
  if (price === null || price === undefined || price === '') return price;
  const num = parseFloat(String(price).replace(/,/g, ''));
  if (isNaN(num)) return price;
  const millions = (num / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
  return `${millions}M`;
}

// Price input fields are entered/displayed in millions (e.g. "25.7") but
// stored and used everywhere else as the full raw number, so values convert
// at the two boundaries: loading a stored value into a form, and submitting
// a form back to the API.
export function millionsToFullNumber(value) {
  if (!value) return '';
  const cleaned = String(value).replace(/,/g, '').replace(/m$/i, '').trim();
  const num = parseFloat(cleaned);
  if (isNaN(num)) return '';
  return String(Math.round(num * 1_000_000));
}

export function fullNumberToMillions(value) {
  if (!value) return '';
  const formatted = formatPriceM(value);
  return formatted.endsWith('M') ? formatted.slice(0, -1) : formatted;
}

// Strips a leading block/house number ("22G Tembeling Road" -> "Tembeling
// Road") and any HDB-style unit number ("12 Marine Terrace, #03-04" ->
// "Marine Terrace") from a location string, per the no-house-number rule for
// generated/outward-facing copy (captions, share text, public listing page).
// This only touches display text -- the raw listing.location value in the
// data/DB is left untouched, and this helper must never be used to alter
// what's stored or shown to the agent inside their own dashboard.
export function sanitizeLocation(location) {
  if (!location) return location;
  return String(location)
    // Leading block/house number: 1-4 digits, optional single letter, then
    // whitespace, only when followed by a non-digit (the street name).
    .replace(/^\s*\d{1,4}[A-Za-z]?\s+(?=\D)/, '')
    // HDB-style unit number anywhere in the string, e.g. "#03-04".
    .replace(/#\d{1,3}-\d{1,5}[A-Za-z]?/g, '')
    // Clean up whitespace/commas orphaned by the strips above.
    .replace(/,\s*,/g, ',')
    .replace(/^\s*,\s*/, '')
    .replace(/\s*,\s*$/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

// Masks an exact price to the "$X.XXM" convention for social captions --
// keeps the whole-million digit(s), masks everything after the decimal so
// the exact figure never appears. Use at most once per caption; never pair
// with the exact formatPriceM() output in the same generated copy.
export function maskPrice(price) {
  if (price === null || price === undefined || price === '') return '';
  const num = parseFloat(String(price).replace(/,/g, ''));
  if (isNaN(num)) return '';
  const wholeMillions = Math.floor(num / 1_000_000);
  return `$${wholeMillions}.XXM`;
}
