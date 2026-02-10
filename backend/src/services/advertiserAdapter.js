import axios from "axios";

export async function advertiserCall(url, params) {

  const resp = await axios.get(url, {
    params,
    timeout: 8000
  });

  return resp.data;
}
