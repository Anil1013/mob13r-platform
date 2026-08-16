// Computes how many campaigns/publishers an org is allowed, based on the
// SUM of limits across every CPA-suite vertical (CPA/CPI/CPS/DCB) they
// currently have active — matches the a-la-carte pricing model, where
// each enabled module contributes its own quota AT WHATEVER TIER that
// vertical is on (basic/growth/pro — higher tiers = more capacity).
// A NULL limit on any active module/tier means "unlimited" — if ANY
// active module is unlimited for a given resource, the whole org is
// unlimited for that resource (can't meaningfully sum with infinity).
// Fails OPEN (returns unlimited) if anything goes wrong, e.g. before
// migration 009 has run — never blocks legitimate usage due to a
// missing table/column.
export async function getCpaLimits(pool, orgId) {
  try {
    const vRes = await pool.query(`SELECT code, tier FROM verticals WHERE org_id = $1 AND is_active = TRUE`, [orgId]);
    if (!vRes.rows.length) return { maxCampaigns: null, maxPublishers: null };

    let maxCampaigns = 0, maxPublishers = 0;
    for (const v of vRes.rows) {
      const planRes = await pool.query(
        `SELECT max_campaigns, max_publishers FROM module_plans WHERE code = $1 AND tier = $2`,
        [v.code, v.tier || "basic"]
      );
      const plan = planRes.rows[0];
      if (!plan) continue; // unknown code/tier combo — skip, doesn't tighten or loosen the limit
      if (plan.max_campaigns === null) { maxCampaigns = null; }
      else if (maxCampaigns !== null) { maxCampaigns += plan.max_campaigns; }
      if (plan.max_publishers === null) { maxPublishers = null; }
      else if (maxPublishers !== null) { maxPublishers += plan.max_publishers; }
    }
    return { maxCampaigns, maxPublishers };
  } catch {
    return { maxCampaigns: null, maxPublishers: null }; // fail open
  }
}
