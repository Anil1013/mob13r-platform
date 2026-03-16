router.get("/dashboard/realtime", async(req,res)=>{

 const stats = await pool.query(`

SELECT

COUNT(*) FILTER (
WHERE status IN ('OTP_SENT','OTP_FAILED','OTP_INVALID')
) AS total_requests,

COUNT(*) FILTER (
WHERE status='OTP_SENT'
) AS otp_sent,

COUNT(*) FILTER (
WHERE status='VERIFIED'
) AS conversions,

COUNT(*) FILTER (
WHERE created_at >= NOW() - INTERVAL '1 hour'
) AS last_hour_requests

FROM pin_sessions

`);

res.json({
status:"SUCCESS",
data:stats.rows[0]
});

});
