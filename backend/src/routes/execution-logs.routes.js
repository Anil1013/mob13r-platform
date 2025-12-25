router.get("/export", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM offer_executions ORDER BY created_at DESC`
  );

  const csv = [
    "id,offer_id,step,status,transaction_id,created_at",
    ...rows.map(
      (r) =>
        `${r.id},${r.offer_id},${r.step},${r.status},${r.transaction_id},${r.created_at}`
    ),
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=offer_execution_logs.csv"
  );
  res.send(csv);
});
