// Computes how many campaigns/publishers an org is allowed, based on the
// SUM of limits across every CPA-suite vertical (CPA/CPI/CPS/DCB) they
// currently have active — matches the a-la-carte pricing model, where
// each enabled module contributes its own quota.
// Fails OPEN (returns unlimited/0-restriction) if anything goes wrong,
// e.g. before migration 008 has run — never blocks legitimate usage
// due to a missing table.
export async function getCpaLimits(pool, orgId) {
  try {
    const vRes = await pool.query(`SELECT code FROM verticals WHERE org_id = $1 AND is_active = TRUE`, [orgId]);
    const codes = vRes.rows.map(r => r.code);
    if (!codes.length) return { maxCampaigns: null, maxPublishers: null };
    const planRes = await pool.query(
      `SELECT COALESCE(SUM(max_campaigns), 0) AS max_campaigns, COALESCE(SUM(max_publishers), 0) AS max_publishers
       FROM module_plans WHERE code = ANY($1)`,
      [codes]
    );
    return {
      maxCampaigns: Number(planRes.rows[0].max_campaigns) || null,
      maxPublishers: Number(planRes.rows[0].max_publishers) || null,
    };
  } catch {
    return { maxCampaigns: null, maxPublishers: null }; // fail open — no module_plans table yet, or any other issue
  }
}
