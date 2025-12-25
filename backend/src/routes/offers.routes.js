router.put("/:id", async (req, res) => {
  try {
    const {
      advertiser_id,
      name,
      geo,
      carrier,
      payout,
      revenue,
      api_mode,

      status_check_url,
      status_check_params = [],

      pin_send_url,
      pin_send_params = [],

      pin_verify_url,
      pin_verify_params = [],

      redirect_url,
      steps,
      is_active,

      fraud_enabled = false,
      fraud_partner = null,
      fraud_service = null,
    } = req.body;

    const safeSteps =
      steps && typeof steps === "object"
        ? steps
        : { status_check: true, pin_send: true, pin_verify: true };

    const { rows } = await pool.query(
      `
      UPDATE offers SET
        advertiser_id = $1,
        name = $2,
        geo = $3,
        carrier = $4,
        payout = $5,
        revenue = $6,
        api_mode = $7,

        status_check_url = $8,
        status_check_params = $9,

        pin_send_url = $10,
        pin_send_params = $11,

        pin_verify_url = $12,
        pin_verify_params = $13,

        redirect_url = $14,
        steps = $15,
        is_active = $16,

        fraud_enabled = $17,
        fraud_partner = $18,
        fraud_service = $19

      WHERE id = $20
      RETURNING *
      `,
      [
        advertiser_id,
        name,
        geo,
        carrier,
        payout,
        revenue,
        api_mode,

        status_check_url,
        status_check_params,

        pin_send_url,
        pin_send_params,

        pin_verify_url,
        pin_verify_params,

        redirect_url || null,
        safeSteps,
        is_active,

        fraud_enabled,
        fraud_partner,
        fraud_service,

        req.params.id,
      ]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Offer not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("UPDATE OFFER ERROR:", err);
    res.status(500).json({ message: "Failed to update offer" });
  }
});
