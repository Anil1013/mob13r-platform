import pool from "../db.js";

export async function logSession(token, data) {

  await pool.query(
    `UPDATE pin_sessions
     SET publisher_request=$1
     WHERE session_token=$2`,
    [data.publisher_request, token]
  );
}
