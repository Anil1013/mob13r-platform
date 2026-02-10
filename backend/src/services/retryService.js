export async function retryCall(fn, retries = 2) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;
    return retryCall(fn, retries - 1);
  }
}
