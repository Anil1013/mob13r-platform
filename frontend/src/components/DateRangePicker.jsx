import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// Plain "yyyy-mm-dd" string <-> Date object — every consumer of this
// component (Reports, Overview, Conversions, Dashboard, Dump Logs,
// PublisherDashboard) already stores/sends dates as this string, so the
// picker converts internally and callers don't need to change anything
// beyond swapping their <input type="date"> for this component.
const toDateObj = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const toIsoString = (date) => {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/**
 * Single date field with a dropdown calendar (DD-MM-YYYY display).
 * value/onChange use plain "yyyy-mm-dd" strings, same as a native
 * <input type="date">, so it's a drop-in replacement.
 */
export function DatePickerField({ value, onChange, placeholder = "Select date", style, minDate, maxDate }) {
  return (
    <DatePicker
      selected={toDateObj(value)}
      onChange={(date) => onChange(toIsoString(date))}
      dateFormat="dd-MM-yyyy"
      placeholderText={placeholder}
      minDate={minDate ? toDateObj(minDate) : undefined}
      maxDate={maxDate ? toDateObj(maxDate) : undefined}
      className="m13-datepicker-input"
      wrapperClassName="m13-datepicker-wrapper"
      customInput={<input style={{ ...dateRangeStyles.input, ...style }} />}
    />
  );
}

/**
 * Grouped "From — To" range picker matching the requested design: a
 * light card with an accent bar and a divider between the two dates.
 * onFromChange/onToChange each receive a plain "yyyy-mm-dd" string.
 */
export default function DateRangePicker({ from, to, onFromChange, onToChange }) {
  return (
    <div style={dateRangeStyles.container}>
      <div style={dateRangeStyles.accentBar} />
      <div style={dateRangeStyles.row}>
        <DatePickerField value={from} onChange={onFromChange} placeholder="From date" maxDate={to || undefined} />
        <div style={dateRangeStyles.divider} />
        <DatePickerField value={to} onChange={onToChange} placeholder="To date" minDate={from || undefined} />
      </div>
    </div>
  );
}

export const dateRangeStyles = {
  container: {
    display: "inline-block",
    background: "#f8fafc",
    borderRadius: 14,
    padding: "14px 18px 12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
  },
  accentBar: {
    height: 4,
    width: "70%",
    margin: "0 auto 12px",
    borderRadius: 4,
    background: "#0f172a",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 0,
  },
  input: {
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    color: "#1e293b",
    background: "#ffffff",
    outline: "none",
    width: 130,
  },
  divider: {
    width: 24,
    height: 2,
    background: "#94a3b8",
    margin: "0 10px",
    flexShrink: 0,
  },
};
