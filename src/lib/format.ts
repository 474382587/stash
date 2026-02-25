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

const conditionLabels: Record<string, string> = {
  fair: "一般",
  good: "良好",
  like_new: "几乎全新",
  new: "全新",
  poor: "较差",
};

export function formatCondition(condition: string | null | undefined): string {
  if (!condition) return "-";
  return conditionLabels[condition] ?? condition;
}
