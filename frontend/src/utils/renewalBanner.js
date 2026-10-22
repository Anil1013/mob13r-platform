// The backend (orgAuth) answers every write with 403 RENEWAL_REQUIRED once an
// org's trial / 30-day cycle / conversion limit is over, while reads keep
// working. Pages never handled that, so edits just silently did nothing.
// This wraps fetch once, app-wide, and shows a dismissible red banner instead.
let installed = false;

function showBanner(message) {
  if (typeof document === "undefined" || document.getElementById("m13-renewal-banner")) return;
  const bar = document.createElement("div");
  bar.id = "m13-renewal-banner";
  bar.setAttribute("role", "alert");
  bar.style.cssText =
    "position:fixed;top:0;left:0;right:0;z-index:99999;background:#dc2626;color:#fff;" +
    "padding:10px 44px 10px 16px;text-align:center;font:600 13.5px/1.4 system-ui,sans-serif;" +
    "box-shadow:0 2px 12px rgba(0,0,0,.25)";
  bar.textContent = "⚠️ Changes are blocked: " + message;
  const close = document.createElement("button");
  close.textContent = "✕";
  close.setAttribute("aria-label", "Dismiss");
  close.style.cssText =
    "position:absolute;right:12px;top:6px;background:none;border:0;color:#fff;font-size:16px;cursor:pointer";
  close.onclick = () => bar.remove();
  bar.appendChild(close);
  document.body.appendChild(bar);
}

export function installRenewalBanner() {
  if (installed || typeof window === "undefined" || !window.fetch) return;
  installed = true;
  const original = window.fetch.bind(window);
  window.fetch = async (...args) => {
    const res = await original(...args);
    try {
      const reqMethod = args[1]?.method || (typeof Request !== "undefined" && args[0] instanceof Request ? args[0].method : "GET");
      if (res.status === 403 && String(reqMethod).toUpperCase() !== "GET") {
        const data = await res.clone().json().catch(() => null);
        if (data?.error === "RENEWAL_REQUIRED") {
          showBanner(data.message || "Your plan needs to be renewed. Please contact admin.");
        }
      }
    } catch { /* never let the banner break a request */ }
    return res;
  };
}
