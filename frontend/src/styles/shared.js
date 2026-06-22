/* Updated styles: Lora font, Premium Dark/Iridescent theme */

const theme = {
  fontFamily: "'Lora', serif",
  bgPrimary: "#05060b",      // Deepest background
  bgCard: "#0d101d",        // Surface color
  accent: "#8b5cf6",        // Iridescent purple accent
  textMain: "#e2e8f0",
  textMuted: "#64748b",
  border: "1px solid rgba(139, 92, 246, 0.15)", // Subtle violet tint
  borderRadius: 12
};

export const btn = { 
  fontFamily: theme.fontFamily,
  padding: "14px 28px", borderRadius: theme.borderRadius, border: "none", 
  background: "linear-gradient(135deg, #6366f1, #8b5cf6)", 
  color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer",
  boxShadow: "0 4px 15px rgba(139, 92, 246, 0.2)"
};

export const btnRed = { 
  fontFamily: theme.fontFamily,
  padding: "14px 28px", borderRadius: theme.borderRadius, border: "1px solid rgba(239,68,68,0.2)", 
  background: "rgba(239,68,68,0.08)", color: "#fb7185", fontSize: 14, fontWeight: 600, cursor: "pointer" 
};

export const input = { 
  fontFamily: theme.fontFamily,
  width: "100%", padding: "14px 18px", borderRadius: theme.borderRadius, 
  border: theme.border, background: theme.bgCard, 
  color: theme.textMain, fontSize: 15, outline: "none" 
};

export const table = { fontFamily: theme.fontFamily, width: "100%", borderCollapse: "separate", borderSpacing: 0 };

export const th = { 
  fontFamily: theme.fontFamily,
  padding: "20px 24px", textAlign: "left", fontSize: 13, fontWeight: 700, 
  color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.15em", 
  borderBottom: theme.border, background: theme.bgCard 
};

export const td = { 
  fontFamily: theme.fontFamily,
  padding: "22px 24px", borderBottom: "1px solid rgba(255,255,255,0.03)", 
  color: theme.textMain, fontSize: 14 
};

export const page = { 
  fontFamily: theme.fontFamily,
  minHeight: "100vh", background: theme.bgPrimary, padding: "48px 32px" 
};

export const badge = (color) => ({
  fontFamily: theme.fontFamily,
  display: "inline-flex", alignItems: "center", gap: 8,
  padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700,
  textTransform: "uppercase",
  background: "rgba(255,255,255,0.03)",
  color: color==="green" ? "#34d399" : color==="red" ? "#fb7185" : "#818cf8",
  border: theme.border,
});

/* ── Dashboard Styles ── */
export const pageTitle = { 
  fontFamily: theme.fontFamily, color: "#f8fafc", fontSize: 36, fontWeight: 400, 
  marginBottom: 32, letterSpacing: "-0.01em" 
};

export const topRow = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, marginBottom: 32, flexWrap: "wrap" };

export const viewTabs = { display: "flex", gap: 10 };

export const tabBtn = { 
  fontFamily: theme.fontFamily,
  padding: "12px 24px", borderRadius: 8, border: "none", 
  background: "transparent", color: theme.textMuted, fontSize: 14, fontWeight: 500, cursor: "pointer" 
};

export const tabBtnActive = { ...tabBtn, background: theme.accent, color: "#ffffff" };

export const statRow = { display: "flex", gap: 20, marginBottom: 32, flexWrap: "wrap" };

export const statCard = { 
  background: theme.bgCard, border: theme.border, 
  borderRadius: 16, padding: "24px", minWidth: 160, flex: 1 
};

export const statLabel = { 
  fontFamily: theme.fontFamily, color: theme.textMuted, fontSize: 11, 
  fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 
};

export const statValue = { fontFamily: theme.fontFamily, fontSize: 32, fontWeight: 300, color: "#ffffff" };

export const filterBar = { marginBottom: 32, display: "flex", gap: 12, flexWrap: "wrap" };

export const filterInput = { ...input, width: 240 };

export const filterSelect = { ...input, width: 240, cursor: "pointer" };

export const applyBtn = { ...btn, padding: "12px 28px" };

export const tableWrap = { 
  background: theme.bgCard, border: theme.border, 
  borderRadius: 20, overflow: "hidden" 
};

export const card = { 
  background: theme.bgCard, border: theme.border, 
  borderRadius: 20, padding: 32 
};
