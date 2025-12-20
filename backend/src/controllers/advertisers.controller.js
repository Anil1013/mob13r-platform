import pool from "../config/db.js";

/**
 * GET /api/advertisers
 */
export const getAdvertisers = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM advertisers ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/advertisers
 */
export const createAdvertiser = async (req, res, next) => {
  try {
    const { name, email } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    const { rows } = await pool.query(
      `INSERT INTO advertisers (name, email)
       VALUES ($1, $2)
       RETURNING *`,
      [name, email]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/advertisers/:id/status
 */
export const updateAdvertiserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { rowCount, rows } = await pool.query(
      `UPDATE advertisers
       SET status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [status, id]
    );

    if (!rowCount) {
      return res.status(404).json({ message: "Advertiser not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};
