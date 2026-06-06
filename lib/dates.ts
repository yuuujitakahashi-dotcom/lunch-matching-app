const DAY_LABELS: Record<number, string> = {
  1: "月",
  2: "火",
  3: "水",
  4: "木",
  5: "金",
};

export function getThisWeekLunchDates(): Date[] {
  const now = new Date();
  const jstNow = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
  const day = jstNow.getDay();
  const monday = new Date(jstNow);
  monday.setDate(jstNow.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);

  return [0, 1, 2, 3, 4].map((i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

export function getNextWeekLunchDates(): Date[] {
  return getThisWeekLunchDates().map((d) => {
    const next = new Date(d);
    next.setDate(next.getDate() + 7);
    return next;
  });
}

export function getWeekAfterNextLunchDates(): Date[] {
  return getThisWeekLunchDates().map((d) => {
    const next = new Date(d);
    next.setDate(next.getDate() + 14);
    return next;
  });
}

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDayLabel(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00+09:00") : date;
  return DAY_LABELS[d.getDay()] ?? "";
}

export function getJstNow(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
}

export function isGroupConfirmed(lunchDate: string): boolean {
  const jstNow = getJstNow();
  const prevDay = new Date(lunchDate + "T20:00:00+09:00");
  prevDay.setDate(prevDay.getDate() - 1);
  return jstNow >= prevDay;
}

export function isCancellable(lunchDate: string): boolean {
  const jstNow = getJstNow();
  const deadline = new Date(lunchDate + "T09:00:00+09:00");
  return jstNow < deadline;
}

export function isToday(lunchDate: string): boolean {
  const jstNow = getJstNow();
  const today = toDateString(jstNow);
  return lunchDate === today;
}
