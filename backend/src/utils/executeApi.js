export async function executeApi({ method, url, payload, headers = {} }) {
  const options = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (method === "POST") {
    options.body = JSON.stringify(payload);
  }

  const res = await fetch(url, options);
  return res.json();
}
