const API_URL = import.meta.env.VITE_API_URL;

// helper to get token
const getToken = () => localStorage.getItem("token");

/* ===================== GET ADVERTISERS ===================== */
export async function getAdvertisers() {
  const res = await fetch(`${API_URL}/api/advertisers`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error("Failed to fetch advertisers");
  return res.json();
}

/* ===================== CREATE ADVERTISER ===================== */
export async function createAdvertiser(data) {
  const res = await fetch(`${API_URL}/api/advertisers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create advertiser");
  return res.json();
}

/* ===================== TOGGLE STATUS ===================== */
export async function toggleAdvertiserStatus(id) {
  const res = await fetch(
    `${API_URL}/api/advertisers/${id}/status`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
    }
  );

  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

/* ===================== DELETE ===================== */
export async function deleteAdvertiser(id) {
  const res = await fetch(`${API_URL}/api/advertisers/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });

  if (!res.ok) throw new Error("Failed to delete advertiser");
  return res.json();
}
