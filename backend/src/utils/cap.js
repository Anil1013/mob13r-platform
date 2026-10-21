// Cap semantics used platform-wide (offers, publisher assignments, campaigns):
//   blank / NULL  -> unlimited
//   0             -> block (no traffic / no credit allowed)
//   N > 0         -> limit of N per day
// Returns { present, ok, value }:
//   present = the key was actually sent (undefined means "leave unchanged")
//   ok      = value is valid (blank/null, or a whole number >= 0)
//   value   = number, or null for unlimited
export function parseCap(v) {
  if (v === undefined) return { present: false, ok: true, value: null };
  if (v === null || (typeof v === "string" && v.trim() === "")) {
    return { present: true, ok: true, value: null };
  }
  if (typeof v !== "number" && typeof v !== "string") {
    return { present: true, ok: false, value: null };
  }
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) return { present: true, ok: false, value: null };
  return { present: true, ok: true, value: n };
}

export const CAP_ERROR = "daily_cap must be a whole number ≥ 0 (blank = unlimited, 0 = block)";
