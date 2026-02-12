import pool from "../db.js";

export async function logSession(token, data) {

  try {

    if (data.publisher_request) {

      await pool.query(
        `UPDATE pin_sessions
         SET publisher_request = $1
         WHERE session_token = $2`,
        [data.publisher_request, token]
      );
    }

    if (data.advertiser_request) {

      await pool.query(
        `UPDATE pin_sessions
         SET advertiser_request = $1
         WHERE session_token = $2`,
        [data.advertiser_request, token]
      );
    }

  } catch (err) {
    console.error("Log session error:", err.message);
  }
}
