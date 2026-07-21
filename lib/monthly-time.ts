export type MonthContext = {
  year: number;
  month: number;
  day: number;
  monthKey: string;
  monthLabel: string;
  compactLabel: string;
  lastDay: number;
};

export function getMonthContext(timeZone = "Asia/Shanghai", date = new Date()): MonthContext {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const year = read("year");
  const month = read("month");
  const day = read("day");
  const monthNumber = String(month).padStart(2, "0");
  return {
    year,
    month,
    day,
    monthKey: `${year}-${monthNumber}-01`,
    monthLabel: `${year}年${month}月`,
    compactLabel: `${year}.${monthNumber}`,
    lastDay: new Date(Date.UTC(year, month, 0)).getUTCDate(),
  };
}

export function shortTime(value: string | null | undefined, fallback = "23:59") {
  return value ? value.slice(0, 5) : fallback;
}
