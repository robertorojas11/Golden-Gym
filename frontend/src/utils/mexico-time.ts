export const MEXICO_TIME_ZONE = 'America/Mexico_City';

const LOCAL_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/;

function asDisplayDate(value: string | Date): { date: Date; timeZone: string } | null {
  if (typeof value === 'string') {
    const local = value.match(LOCAL_TIMESTAMP);
    const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value);
    if (local && !hasExplicitZone) {
      const [, year, month, day, hour, minute, second = '00'] = local;
      return {
        date: new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)),
        timeZone: 'UTC',
      };
    }
  }
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, timeZone: MEXICO_TIME_ZONE };
}

export function formatMexicoDateTime(value: string | Date): string {
  const display = asDisplayDate(value);
  if (!display) return 'N/A';
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: display.timeZone,
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(display.date);
}

export function formatMexicoDate(value: string | Date): string {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-');
    return `${day}/${month}/${year}`;
  }
  const display = asDisplayDate(value);
  if (!display) return 'N/A';
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: display.timeZone,
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(display.date);
}

export function formatMexicoTime(value: string | Date): string {
  const display = asDisplayDate(value);
  if (!display) return 'N/A';
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: display.timeZone,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(display.date);
}

export function getMexicoDateString(value: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: MEXICO_TIME_ZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value || '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export function getMexicoYearMonth(value: Date = new Date()): string {
  return getMexicoDateString(value).slice(0, 7);
}

export function addDaysToDateString(date: string, days: number): string {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, day));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function formatMexicoLongDate(value: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: MEXICO_TIME_ZONE,
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }).format(value);
}

export function formatMexicoClock(value: Date = new Date()): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: MEXICO_TIME_ZONE,
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).format(value);
}
