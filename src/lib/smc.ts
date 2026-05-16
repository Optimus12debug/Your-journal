export type TimeframeKey = "monthly" | "weekly" | "daily" | "h4" | "h1";

export const TIMEFRAMES: { key: TimeframeKey; label: string }[] = [
  { key: "monthly", label: "Monthly" },
  { key: "weekly", label: "Weekly" },
  { key: "daily", label: "Daily" },
  { key: "h4", label: "4 Hour" },
  { key: "h1", label: "1 Hour" },
];

export const SMC_FLAGS = [
  { key: "respecting_pd", label: "Respecting PD Array" },
  { key: "disrespecting_pd", label: "Disrespecting PD Array" },
  { key: "fvg", label: "FVG Present" },
  { key: "liquidity_sweep", label: "Liquidity Sweep" },
  { key: "bos", label: "BOS" },
  { key: "choch", label: "CHOCH" },
  { key: "mitigation", label: "Mitigation" },
  { key: "order_block", label: "Order Block" },
  { key: "breaker_block", label: "Breaker Block" },
  { key: "rejection", label: "Rejection" },
  { key: "premium_discount", label: "Premium/Discount" },
] as const;

export type TimeframeAnalysis = {
  structure?: string;
  bias?: "bullish" | "bearish" | "";
  flags?: Record<string, boolean>;
  rr_expectation?: string;
  confidence?: number;
  notes?: string;
};

export const SESSIONS = ["London", "New York", "Asia"] as const;
export const OUTCOMES = ["win", "loss", "breakeven"] as const;

export const SMC_EXTRA_FIELDS = [
  "inducement",
  "internal_liquidity",
  "external_liquidity",
  "smt_divergence",
  "ote_entry",
  "session_liquidity",
  "macro_bias",
  "kill_zone",
  "manipulation",
  "distribution_accumulation",
] as const;
