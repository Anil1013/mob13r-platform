const API_URL = import.meta.env.VITE_API_URL;

export async function getAdvertisers() {
  const res = await fetch(`${API_URL}/advertisers`, {
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) throw new Error("Failed to fetch advertisers");
  return res.json();
}

export async function createAdvertiser(data) {
  const res = await fetch(`${API_URL}/advertisers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error("Failed to create advertiser");
  return res.json();
}
