// Small helper for dashboard writes (POST/PATCH/PUT/DELETE).
// fetch() never throws on a 4xx/5xx, so callers that just `await fetch(...)`
// silently look "saved" while the server actually rejected the change.
// This returns { ok, data } and tells the user when a save failed.
export async function apiMutate(url, options = {}) {
  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // RENEWAL_REQUIRED is already shown as a banner (see renewalBanner.js)
      if (data.error !== "RENEWAL_REQUIRED") {
        alert(data.message || data.error || `Save failed (${res.status})`);
      }
      return { ok: false, data };
    }
    return { ok: true, data };
  } catch {
    alert("Network error — your change was not saved.");
    return { ok: false, data: {} };
  }
}
