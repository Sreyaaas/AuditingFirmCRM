/**
 * Utility to convert numeric amounts to Indian numbering words (INR).
 * Follows the Indian numbering system: Crores, Lakhs, Thousands, Hundreds.
 * Example: 59072 -> "Rupees Fifty-Nine Thousand Seventy-Two Only"
 */

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

/**
 * Converts numbers from 1 to 99 to words (with hyphen for compound numbers like Fifty-Nine).
 */
const convertUnderHundred = (n: number): string => {
  if (n <= 0) return '';
  if (n < 20) return ONES[n];
  const ten = TENS[Math.floor(n / 10)];
  const one = ONES[n % 10];
  return one ? `${ten}-${one}` : ten;
};

/**
 * Converts numbers from 1 to 999 to words.
 */
const convertUnderThousand = (n: number): string => {
  if (n <= 0) return '';
  const hundred = Math.floor(n / 100);
  const remainder = n % 100;

  const parts: string[] = [];
  if (hundred > 0) {
    parts.push(`${ONES[hundred]} Hundred`);
  }
  if (remainder > 0) {
    parts.push(convertUnderHundred(remainder));
  }
  return parts.join(' ');
};

/**
 * Converts a positive integer into Indian numbering words without currency prefix/suffix.
 */
const convertIndianInteger = (num: number): string => {
  if (num === 0) return '';

  const parts: string[] = [];

  // Crores (10,000,000+)
  const crores = Math.floor(num / 10000000);
  num %= 10000000;
  if (crores > 0) {
    const croreLabel = crores === 1 ? 'Crore' : 'Crores';
    parts.push(`${convertIndianInteger(crores)} ${croreLabel}`);
  }

  // Lakhs (100,000 - 9,999,999)
  const lakhs = Math.floor(num / 100000);
  num %= 100000;
  if (lakhs > 0) {
    const lakhLabel = lakhs === 1 ? 'Lakh' : 'Lakhs';
    parts.push(`${convertUnderHundred(lakhs)} ${lakhLabel}`);
  }

  // Thousands (1,000 - 99,999)
  const thousands = Math.floor(num / 1000);
  num %= 1000;
  if (thousands > 0) {
    parts.push(`${convertUnderHundred(thousands)} Thousand`);
  }

  // Hundreds and units (1 - 999)
  if (num > 0) {
    parts.push(convertUnderThousand(num));
  }

  return parts.join(' ').trim();
};

/**
 * Converts an INR currency amount into words formatted as:
 * "Rupees [Words] Only" or "Rupees [Words] and [Paise] Paise Only"
 * E.g. 59072 -> "Rupees Fifty-Nine Thousand Seventy-Two Only"
 */
export const numberToWordsINR = (amount: number): string => {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'Rupees Zero Only';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const rounded = Math.round(absAmount * 100) / 100;

  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  if (rupees === 0 && paise === 0) {
    return 'Rupees Zero Only';
  }

  let words = '';

  if (rupees > 0) {
    words = `Rupees ${convertIndianInteger(rupees)}`;
  }

  if (paise > 0) {
    const paiseText = `${convertUnderHundred(paise)} ${paise === 1 ? 'Paisa' : 'Paise'}`;
    if (rupees > 0) {
      words += ` and ${paiseText}`;
    } else {
      words = `${paiseText}`;
    }
  }

  words += ' Only';

  return isNegative ? `Minus ${words}` : words;
};
