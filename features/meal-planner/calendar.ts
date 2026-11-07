const spanishLocale = 'es-ES';

export function addDays(date: string, amount: number): string {
  const value = parseDate(date);
  value.setUTCDate(value.getUTCDate() + amount);
  return toDateString(value);
}

export function getWeekStartDate(date: string): string {
  const value = parseDate(date);
  const mondayOffset = (value.getUTCDay() + 6) % 7;
  value.setUTCDate(value.getUTCDate() - mondayOffset);
  return toDateString(value);
}

export function getWeekDates(date: string): string[] {
  const monday = getWeekStartDate(date);
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function getMonthKey(date: string): string {
  parseDate(date);
  return date.slice(0, 7);
}

export function navigateMonth(month: string, offset: number): string {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new RangeError('Month must use YYYY-MM format.');
  const [year, monthNumber] = month.split('-').map(Number);
  const value = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function getMonthCalendarDays(month: string): ({ date: string; isCurrentMonth: boolean } | null)[] {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new RangeError('Month must use YYYY-MM format.');
  const [year, monthNumber] = month.split('-').map(Number);
  if (monthNumber < 1 || monthNumber > 12) throw new RangeError('Month is out of range.');
  const first = new Date(Date.UTC(year, monthNumber - 1, 1));
  const dayCount = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const leadingCells = (first.getUTCDay() + 6) % 7;
  const cells: ({ date: string; isCurrentMonth: boolean } | null)[] = [
    ...Array.from({ length: leadingCells }, () => null),
    ...Array.from({ length: dayCount }, (_, index) => ({ date: `${month}-${String(index + 1).padStart(2, '0')}`, isCurrentMonth: true })),
  ];
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatDate(date: string, options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' }): string {
  return new Intl.DateTimeFormat(spanishLocale, { ...options, timeZone: 'UTC' }).format(parseDate(date));
}

export function formatMonth(month: string): string {
  if (!/^\d{4}-\d{2}$/.test(month)) throw new RangeError('Month must use YYYY-MM format.');
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(spanishLocale, { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

export function getTodayDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function parseDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new RangeError('Date must use YYYY-MM-DD format.');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new RangeError('Date is invalid.');
  return date;
}

function toDateString(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}
