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
