import pool from "../db.js";

export async function logSession(token, data) {

  if (!token) return;

  const fields = [];
  const values = [];
  let index = 1;

  if (data.publisher_request) {
    fields.push(`publisher_request = $${index}::jsonb`);
    values.push(JSON.stringify(data.publisher_request));
    index++;
  }

  if (data.advertiser_request) {
    fields.push(`advertiser_request = $${index}::jsonb`);
    values.push(JSON.stringify(data.advertiser_request));
    index++;
  }

  if (data.publisher_response) {
    fields.push(`publisher_response = $${index}::jsonb`);
    values.push(JSON.stringify(data.publisher_response));
    index++;
  }

  if (data.advertiser_response) {
    fields.push(`advertiser_response = $${index}::jsonb`);
    values.push(JSON.stringify(data.advertiser_response));
    index++;
  }

  if (!fields.length) return;

  values.push(token);

  await pool.query(
    `
    UPDATE pin_sessions
    SET ${fields.join(", ")}
    WHERE session_token = $${index}::uuid
    `,
    values
  );
}
