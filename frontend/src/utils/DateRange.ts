function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function getMonthBounds(): { start: string; end: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: toISODate(start), end: toISODate(today) };
}