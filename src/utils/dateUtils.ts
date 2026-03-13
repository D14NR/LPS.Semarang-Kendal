export const INDONESIAN_MONTHS: Record<string, number> = {
  jan: 0,
  januari: 0,
  feb: 1,
  februari: 1,
  mar: 2,
  maret: 2,
  apr: 3,
  april: 3,
  mei: 4,
  jun: 5,
  juni: 5,
  jul: 6,
  juli: 6,
  agu: 7,
  agustus: 7,
  sep: 8,
  september: 8,
  okt: 9,
  oktober: 9,
  nov: 10,
  november: 10,
  des: 11,
  desember: 11,
};

export const formatDateIndo = (date: Date, withTime = false): string => {
  if (Number.isNaN(date.getTime())) return '';
  const options: Intl.DateTimeFormatOptions = withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('id-ID', options).format(date);
};

export const parseIndoDateString = (value: string): Date | null => {
  if (!value) return null;
  const trimmed = value.trim();

  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  const monthMatch = trimmed
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .match(/(\d{1,2})\s*([a-zA-Z]+)\s*(\d{4})/);
  if (monthMatch) {
    const day = parseInt(monthMatch[1], 10);
    const monthKey = monthMatch[2].toLowerCase();
    const month = INDONESIAN_MONTHS[monthKey] ?? INDONESIAN_MONTHS[monthKey.slice(0, 3)];
    const year = parseInt(monthMatch[3], 10);
    if (month !== undefined) {
      const date = new Date(year, month, day);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  const numericMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (numericMatch) {
    const day = parseInt(numericMatch[1], 10);
    const month = parseInt(numericMatch[2], 10) - 1;
    const year = parseInt(numericMatch[3], 10) < 100 ? 2000 + parseInt(numericMatch[3], 10) : parseInt(numericMatch[3], 10);
    const date = new Date(year, month, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
};

export const normalizeDateToIndo = (value: string, withTime = false): string => {
  if (!value) return '';
  const parsed = parseIndoDateString(value);
  if (!parsed) return value;
  return formatDateIndo(parsed, withTime);
};

export const normalizeDateInput = (value: string): string => {
  if (!value) return '';
  const parsed = parseIndoDateString(value);
  if (!parsed) return value;
  return formatDateIndo(parsed, false);
};
