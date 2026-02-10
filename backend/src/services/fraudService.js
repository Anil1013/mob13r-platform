export async function fraudCheck(data) {

  if (!data.msisdn) throw new Error("MSISDN missing");

  if (data.msisdn.length < 8)
    throw new Error("Invalid MSISDN");
}
