export const meals = [
  { key: "breakfast", label: "Pequeno-almoço" },
  { key: "lunch", label: "Almoço" },
  { key: "dinner", label: "Jantar" },
  { key: "snack", label: "Snacks" },
] as const;

export const zoneCookie = "healthyseason_timezone";
export const defaultZone = "Europe/Lisbon";

export function dayInZone(zone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"].map((part) => parts.find(({ type }) => type === part)?.value).join("-");
}
