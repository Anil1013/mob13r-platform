export function buildPayload(params, source) {
  const payload = {};

  params.forEach((key) => {
    if (source[key] !== undefined) {
      payload[key] = source[key];
    }
  });

  return payload;
}
