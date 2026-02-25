import { format, parseISO } from "date-fns";

const currencySymbols: Record<string, string> = {
  CAD: "CA$",
  CNY: "¥",
  EUR: "€",
  GBP: "£",
  HKD: "HK$",
  JPY: "¥",
  KRW: "₩",
  TWD: "NT$",
  USD: "$",
};

export function formatMoney(
  amount: number | null | undefined,
  currency: string = "USD"
): string {
  if (amount == null) return "-";
  const symbol = currencySymbols[currency] ?? currency;
  if (currency === "JPY" || currency === "KRW") {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  return `${symbol}${amount.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    return format(parseISO(dateStr), "yyyy-MM-dd");
  } catch {
    return dateStr;
  }
}

export function formatCount(count: number, singular: string, plural?: string): string {
  const p = plural ?? `${singular}s`;
  return `${count} ${count === 1 ? singular : p}`;
}

const conditionKeys: Record<string, string> = {
  fair: "conditionFair",
  good: "conditionGood",
  like_new: "conditionLikeNew",
  new: "conditionNew",
  poor: "conditionPoor",
};

export function formatCondition(
  condition: string | null | undefined,
  t?: (key: string) => string
): string {
  if (!condition) return "-";
  const key = conditionKeys[condition];
  if (key && t) return t(key);
  return condition;
}
