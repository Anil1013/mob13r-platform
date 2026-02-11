import pool from "../db.js";

export async function logSession(sessionToken, data = {}) {

  const existing = await pool.query(
    `SELECT publisher_request,
            publisher_response,
            advertiser_request,
            advertiser_response
     FROM pin_sessions
     WHERE session_token=$1`,
    [sessionToken]
  );

  if (!existing.rows.length) return;

  const row = existing.rows[0];

  await pool.query(
    `UPDATE pin_sessions
     SET publisher_request = COALESCE($1, publisher_request),
         publisher_response = COALESCE($2, publisher_response),
         advertiser_request = COALESCE($3, advertiser_request),
         advertiser_response = COALESCE($4, advertiser_response)
     WHERE session_token=$5`,
    [
      data.publisher_request || row.publisher_request,
      data.publisher_response || row.publisher_response,
      data.advertiser_request || row.advertiser_request,
      data.advertiser_response || row.advertiser_response,
      sessionToken
    ]
  );
}
