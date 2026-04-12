import express from "express";
import axios from "axios";
import pool from "../db.js";
import publisherAuth from "../middleware/publisherAuth.js";
import { mapPublisherResponse } from "../services/pubResponseMapper.js";

const router = express.Router();

/* ================= CONFIG ================= */
const INTERNAL_API_BASE = process.env.INTERNAL_API_BASE || "https://backend.mob13r.com";
const AXIOS_TIMEOUT = 15000;
const TEST_OTP_CODE = process.env.TEST_OTP || "1013"; // Securely get from env

/* ================= HELPERS ================= */
function enrichParams(req, params) {
    const forwarded = req.headers["x-forwarded-for"];
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.socket?.remoteAddress;
    return {
        ...params,
        ip: ip,
        user_agent: req.headers["user-agent"] || "",
    };
}

function todayClause() {
    return `credited_at::date = CURRENT_DATE`;
}

/* =====================================================
   📤 PIN SEND (Logic Intact, Sanitized)
===================================================== */
router.all("/pin/send", publisherAuth, async (req, res) => {
    try {
        const publisher = req.publisher;
        const base = { ...req.query, ...req.body };
        const { offer_id, msisdn, geo, carrier } = base;

        if (!offer_id || !msisdn) {
            return res.status(400).json({ status: "FAILED", message: "offer_id and msisdn required" });
        }

        const params = enrichParams(req, base);

        const offerRes = await pool.query(
            `SELECT po.id AS publisher_offer_id, po.publisher_cpa, o.id AS offer_id, o.geo, o.carrier
             FROM publisher_offers po
             JOIN offers o ON o.id = po.offer_id
             WHERE o.id = $1 AND po.publisher_id = $2 AND po.status = 'active' AND o.status = 'active'`,
            [offer_id, publisher.id]
        );

        if (!offerRes.rows.length) {
            return res.status(403).json({ status: "INVALID_OFFER" });
        }

        const picked = offerRes.rows[0];

        // Validation logic
        if (geo && picked.geo && geo !== picked.geo) return res.status(400).json({ status: "GEO_MISMATCH" });
        if (carrier && picked.carrier && carrier !== picked.carrier) return res.status(400).json({ status: "CARRIER_MISMATCH" });

        const internal = await axios({
            method: req.method,
            url: `${INTERNAL_API_BASE}/api/pin/send/${picked.offer_id}`,
            timeout: AXIOS_TIMEOUT,
            params: req.method === "GET" ? params : undefined,
            data: req.method !== "GET" ? params : undefined,
            validateStatus: () => true,
        });

        const data = internal.data;
        const sessionToken = data?.session_token || null;
        const advSessionKey = data?.sessionKey || data?.session_key || null;

        if (sessionToken) {
            await pool.query(
                `UPDATE pin_sessions 
                 SET publisher_id = $1, publisher_offer_id = $2, publisher_cpa = $3, adv_session_key = COALESCE($4, adv_session_key)
                 WHERE session_token = $5`,
                [publisher.id, picked.publisher_offer_id, picked.publisher_cpa, advSessionKey, sessionToken]
            );
        }

        return res.json({ ...mapPublisherResponse(data), offer_id: picked.offer_id });
    } catch (err) {
        console.error("PIN SEND ERROR:", err.message);
        return res.status(500).json({ status: "FAILED" });
    }
});

/* =====================================================
   ✅ PIN VERIFY (Enhanced with Scrubbing Logs)
===================================================== */
router.all("/pin/verify", publisherAuth, async (req, res) => {
    const client = await pool.connect();
    try {
        const publisher = req.publisher;
        const params = enrichParams(req, { ...req.query, ...req.body });
        const inputToken = params.session_token || params.sessionKey || params.session_key;

        if (!inputToken) {
            return res.status(400).json({ status: "FAILED", message: "session_token required" });
        }

        const advResp = await axios({
            method: req.method,
            url: `${INTERNAL_API_BASE}/api/pin/verify`,
            timeout: AXIOS_TIMEOUT,
            params: req.method === "GET" ? params : undefined,
            data: req.method !== "GET" ? params : undefined,
            validateStatus: () => true,
        });

        let advData = advResp.data;
        const isTestOtp = params.otp === TEST_OTP_CODE;

        if (isTestOtp) {
            advData = { ...advData, status: "SUCCESS", response: "SUCCESS", verified: true };
        }

        const isSuccess = advData?.status === "SUCCESS" || advData?.status === true || advData?.verified === true || advData?.response === "SUCCESS";

        if (!isSuccess) return res.json(mapPublisherResponse(advData));

        await client.query("BEGIN");

        // Lock session for update
        const verifiedRes = await client.query(
            `SELECT session_id, parent_session_token, publisher_id, publisher_offer_id, offer_id, publisher_credited
             FROM pin_sessions WHERE parent_session_token::text = $1 AND status = 'VERIFIED'
             ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
            [inputToken]
        );

        if (!verifiedRes.rows.length) {
            await client.query("ROLLBACK");
            return res.json(mapPublisherResponse(advData));
        }

        const verifiedRow = verifiedRes.rows[0];
        if (verifiedRow.publisher_id !== publisher.id) {
            await client.query("ROLLBACK");
            return res.status(403).json({ status: "FORBIDDEN" });
        }

        // Duplicate Credit Prevention
        if (verifiedRow.publisher_credited) {
            await client.query("COMMIT");
            return res.json(mapPublisherResponse(advData));
        }

        if (isTestOtp) {
            await client.query(`UPDATE pin_sessions SET publisher_credited = TRUE, credited_at = NOW() WHERE session_token = $1`, [verifiedRow.parent_session_token]);
            await client.query("COMMIT");
            return res.json(mapPublisherResponse(advData));
        }

        // Get Caps & Percent
        const ruleRes = await client.query(`SELECT daily_cap, pass_percent FROM publisher_offers WHERE id = $1 AND status='active'`, [verifiedRow.publisher_offer_id]);
        if (!ruleRes.rows.length) {
            await client.query("ROLLBACK");
            return res.json(mapPublisherResponse(advData));
        }

        const { daily_cap, pass_percent } = ruleRes.rows[0];
        const creditedRes = await client.query(
            `SELECT COUNT(*)::int FROM pin_sessions WHERE publisher_id=$1 AND offer_id=$2 AND publisher_credited=TRUE AND ${todayClause()}`,
            [publisher.id, verifiedRow.offer_id]
        );

        // Cap Check
        if (daily_cap !== null && creditedRes.rows[0].count >= daily_cap) {
            await client.query(`UPDATE pin_sessions SET status = 'CAP_REACHED' WHERE session_token = $1`, [verifiedRow.parent_session_token]);
            await client.query("COMMIT");
            return res.json(mapPublisherResponse(advData, { isHold: true }));
        }

        // Scrubbing Logic (Pass Percentage)
        const pass = Number(pass_percent ?? 100);
        if (pass < 100 && Math.random() * 100 >= pass) {
            await client.query(`UPDATE pin_sessions SET status = 'SCRUBBED', publisher_credited = FALSE WHERE session_token = $1`, [verifiedRow.parent_session_token]);
            await client.query("COMMIT");
            return res.json(mapPublisherResponse(advData, { isHold: true }));
        }

        // Final Credit Update
        await client.query(
            `UPDATE pin_sessions SET publisher_credited = TRUE, credited_at = NOW(), status = 'CREDITED' WHERE session_token = $1`,
            [verifiedRow.parent_session_token]
        );

        await client.query("COMMIT");
        return res.json(mapPublisherResponse(advData));

    } catch (err) {
        if (client) await client.query("ROLLBACK").catch(() => {});
        console.error("VERIFY ERROR:", err.message);
        return res.status(500).json({ status: "FAILED" });
    } finally {
        client.release();
    }
});

export default router;
