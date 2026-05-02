const CHILE_MOBILE_PREFIX = "+569";
const CHILE_MOBILE_DIGITS = 8;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function extractLocalMobileDigits(value: string) {
  const digits = onlyDigits(value);

  if (!digits) {
    return "";
  }

  if (digits.startsWith("569") && digits.length >= 11) {
    return digits.slice(3, 11);
  }

  if (digits.startsWith("56") && digits.length >= 10 && digits[2] === "9") {
    return digits.slice(3, 11);
  }

  if (digits.startsWith("09") && digits.length >= 10) {
    return digits.slice(2, 10);
  }

  if (digits.startsWith("9") && digits.length >= 9) {
    return digits.slice(1, 9);
  }

  if (digits.length >= 8) {
    return digits.slice(0, 8);
  }

  return digits.slice(0, 8);
}

export function normalizeChileMobilePhone(input: string): string | null {
  const localDigits = extractLocalMobileDigits(input);

  if (localDigits.length !== CHILE_MOBILE_DIGITS) {
    return null;
  }

  return `${CHILE_MOBILE_PREFIX}${localDigits}`;
}

export function formatChileMobilePhone(input: string): string {
  const localDigits = extractLocalMobileDigits(input);

  if (!localDigits) {
    return "";
  }

  const head = localDigits.slice(0, 4);
  const tail = localDigits.slice(4, 8);

  return tail ? `${head} ${tail}` : head;
}

export function isValidChileMobilePhone(input: string): boolean {
  return normalizeChileMobilePhone(input) !== null;
}
