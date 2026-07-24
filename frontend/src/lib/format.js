// Small presentation helpers shared across the dashboard.

// Format an amount using the account's currency (falls back to a plain
// number with the currency code as a prefix if the code isn't recognised).
export function formatMoney(amount, currency = "INR") {
  const value = Number(amount) || 0;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }
}

// The symbol for a currency code ("₹", "$", …), for the animated balance.
export function currencySymbol(currency = "INR") {
  try {
    const parts = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value || `${currency} `;
  } catch {
    return `${currency} `;
  }
}

// "12:00 AM • May 10, 2023"
export function formatDate(input) {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const time = d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const date = d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${time} • ${date}`;
}

// Up to two initials from a name, for avatar bubbles.
export function initials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Time-of-day greeting.
export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
