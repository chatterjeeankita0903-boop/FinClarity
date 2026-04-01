import { format, subMonths, parse } from 'date-fns';

export function getCurrentMonth(): string {
  return format(new Date(), 'yyyy-MM');
}

export function getCurrentMonthLabel(): string {
  return format(new Date(), 'MMMM yyyy');
}

export function getMonthLabel(monthKey: string): string {
  try {
    const d = parse(monthKey + '-01', 'yyyy-MM-dd', new Date());
    return format(d, 'MMM yyyy');
  } catch {
    return monthKey;
  }
}

export function getShortMonthLabel(monthKey: string): string {
  try {
    const d = parse(monthKey + '-01', 'yyyy-MM-dd', new Date());
    return format(d, 'MMM');
  } catch {
    return monthKey;
  }
}

export function getRecentMonths(count: number): string[] {
  const now = new Date();
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    months.push(format(subMonths(now, i), 'yyyy-MM'));
  }
  return months.reverse();
}

export function getPreviousMonth(): string {
  return format(subMonths(new Date(), 1), 'yyyy-MM');
}
