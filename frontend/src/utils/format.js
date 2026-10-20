// Formats a price (raw number, or a comma-formatted string like "10,280,000")
// as millions, e.g. 10280000 -> "10.28M", 28000000 -> "28M". Returns the
// original value unchanged if it can't be parsed as a number.
export function formatPriceM(price) {
  if (price === null || price === undefined || price === '') return price;
  const num = parseFloat(String(price).replace(/,/g, ''));
  if (isNaN(num)) return price;
  // Under $1M reads as thousands ("880K"), never "0.88M".
  // $999,500+ would round to "1000K", so it falls through to the millions path ("1M").
  if (num > 0 && Math.round(num / 1000) < 1000 && num < 1_000_000) return `${Math.round(num / 1000)}K`;
  const millions = (num / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
  return `${millions}M`;
}

// Returns null when there's no usable price (blank, zero, or unparseable)
// so a display call site can show a clean "Price on request" instead of a
// glitchy "SGD NaN" / "SGD " artifact -- price is now an optional field.
// Distinct from formatPriceM itself, which several existing callers
// (captions, maskPrice) still call directly and rely on getting the input
// back unchanged when there's nothing to format.
export function formatPriceDisplay(price) {
  if (price === null || price === undefined || price === '') return null;
  const num = parseFloat(String(price).replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return null;
  return formatPriceM(price);
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
  const num = parseFloat(String(value).replace(/,/g, ''));
  if (isNaN(num)) return value;
  // Always millions here (form fields are entered in millions), so 880000 -> "0.88".
  return (num / 1_000_000).toFixed(2).replace(/\.?0+$/, '');
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

// Masks an exact price for social captions so the exact figure never
// appears. Use at most once per caption; never pair with the exact
// formatPriceM() output in the same generated copy.
//   $1M and over: keeps the whole-million digit(s) -> "$12.XXM" (unchanged).
//   Under $1M (condos, ECs, apartments): keeps the hundred-thousands digit ->
//     $880,000 -> "$8XXK", never the old "$0.XXM" (which read as a defect).
//   Under $100K, zero, negative or unparseable: "" (no price line beats a
//     wrong-looking one -- a real listing price is never that low).
export function maskPrice(price) {
  if (price === null || price === undefined || price === '') return '';
  const num = parseFloat(String(price).replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return '';
  if (num >= 1_000_000) {
    const wholeMillions = Math.floor(num / 1_000_000);
    return `$${wholeMillions}.XXM`;
  }
  const hundredThousands = Math.floor(num / 100_000);
  if (hundredThousands < 1) return '';
  return `$${hundredThousands}XXK`;
}

// Same rules as the backend's _strip_cea_block: the "CEA Reg No:" line, any
// "Agency: ... (Licence No: ...)" line, and the "Name | phone" line directly
// above the reg-no line. Ordinary "|" lines are left alone. A condo write-up
// already ends with this block, and the caption adds its own exactly once.
const CEA_BLOCK_RE = /(?:^[^\n]*\|[^\n]*\n(?=CEA Reg No:))?^CEA Reg No:[^\n]*\n?|^Agency:[^\n]*\(Licence No:[^\n]*\)[^\n]*\n?/gm;

export function stripCeaBlock(text) {
  if (!text) return text;
  try {
    return String(text).replace(CEA_BLOCK_RE, '').replace(/\n{3,}/g, '\n\n').trimEnd();
  } catch {
    return text;
  }
}
