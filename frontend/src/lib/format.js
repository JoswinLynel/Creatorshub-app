export const fmtNumber = (n) => {
  if (n === null || n === undefined) return "—";
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return Math.round(n).toLocaleString();
};

export const fmtMoney = (n, currency = "USD") => {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `$${n || 0}`;
  }
};

export const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2, "0")} ${period}`;
};

export const fmtDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const relativeTime = (iso) => {
  if (!iso) return "just now";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const d = Math.floor(hrs / 24);
  return `${d}d ago`;
};

export const initials = (name = "") => {
  return name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
};

export const avatarColor = (seed = "") => {
  const colors = ["#7c3aed", "#C13584", "#0A66C2", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
  let sum = 0;
  for (let i = 0; i < seed.length; i++) sum += seed.charCodeAt(i);
  return colors[sum % colors.length];
};
