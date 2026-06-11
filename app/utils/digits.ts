/**
 * Converts Eastern Arabic numerals (٠-٩) and Persian numerals (۰-۹)
 * to standard Western Arabic (English) numerals (0-9).
 */
export function convertDigits(str: string): string {
  if (!str) return "";
  const eastern = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];
  const persian = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];
  let res = str;
  for (let i = 0; i < 10; i++) {
    res = res.replaceAll(eastern[i], String(i)).replaceAll(persian[i], String(i));
  }
  return res;
}
