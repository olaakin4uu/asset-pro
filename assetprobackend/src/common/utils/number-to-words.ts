/**
 * Convert a number to words (Nigerian Naira style).
 * e.g. 3000000 → "Three Million Naira Only"
 * e.g. 1500.50 → "One Thousand, Five Hundred Naira, Fifty Kobo Only"
 */

const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];

function convertHundreds(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(ones[Math.floor(n / 100)] + ' Hundred');
    n %= 100;
    if (n > 0) parts.push('and');
  }
  if (n >= 20) {
    const t = tens[Math.floor(n / 10)];
    const o = ones[n % 10];
    parts.push(o ? `${t}-${o}` : t);
  } else if (n > 0) {
    parts.push(ones[n]);
  }
  return parts.join(' ');
}

function convertInteger(n: number): string {
  if (n === 0) return 'Zero';

  const groups: string[] = [];
  let scaleIndex = 0;

  while (n > 0) {
    const chunk = n % 1000;
    if (chunk > 0) {
      const words = convertHundreds(chunk);
      const scale = scales[scaleIndex];
      groups.unshift(scale ? `${words} ${scale}` : words);
    }
    n = Math.floor(n / 1000);
    scaleIndex++;
  }

  return groups.join(', ');
}

export function numberToNairaWords(amount: number): string {
  if (amount < 0) return 'Negative ' + numberToNairaWords(-amount);

  const naira = Math.floor(amount);
  const kobo = Math.round((amount - naira) * 100);

  let result = convertInteger(naira) + ' Naira';
  if (kobo > 0) {
    result += ', ' + convertInteger(kobo) + ' Kobo';
  }
  result += ' Only';

  return result;
}
