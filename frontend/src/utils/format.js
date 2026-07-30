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
