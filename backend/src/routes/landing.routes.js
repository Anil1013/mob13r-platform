import express from "express";
import pool from "../db.js";
import { uploadToS3 } from "../services/s3Upload.js";

const router = express.Router();

const FRONTEND_BASE_URL = "https://dashboard.mob13r.com";

const allowedMimeTypes = ["image/png","image/jpeg","image/jpg","image/webp","image/svg+xml"];

const parseBool = (v) => v === true || v === "true";

const validateImage = (file) => {
  if (!file) return null;
  if (!allowedMimeTypes.includes(file.mimetype)) return "Invalid image format";
  if (file.size > 10 * 1024 * 1024) return "Image exceeds 10MB";
  return null;
};

/* GET PUBLISHER OFFERS */
router.get("/publisher-offers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT po.id, po.offer_id, po.publisher_cpa,
        p.name AS publisher_name,
        o.service_name, o.geo, o.carrier, o.portal_url,
        o.has_antifraud, o.has_status_check, o.has_portal_step
      FROM publisher_offers po
      LEFT JOIN publishers p ON p.id = po.publisher_id
      LEFT JOIN offers o ON o.id = po.offer_id
      WHERE po.status='active'
      ORDER BY po.id DESC
    `);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* CREATE LANDING */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const { publisher_offer_id, title } = body;

    if (!publisher_offer_id || !title) {
      return res.status(400).json({ status: "FAILED", error: "publisher_offer_id and title required" });
    }

    const heroFile = req.files?.heroFile;
    const logoFile = req.files?.logoFile;
    const backgroundFile = req.files?.backgroundFile;

    const heroError = validateImage(heroFile);
    if (heroError) return res.status(400).json({ status: "FAILED", error: heroError });
    const logoError = validateImage(logoFile);
    if (logoError) return res.status(400).json({ status: "FAILED", error: logoError });
    const bgError = validateImage(backgroundFile);
    if (bgError) return res.status(400).json({ status: "FAILED", error: bgError });

    let finalHero = body.image_url || "";
    let finalLogo = body.logo_url || "";
    let finalBackground = body.background_url || "";

    if (heroFile) finalHero = await uploadToS3(heroFile, "uploads/heroes");
    if (logoFile) finalLogo = await uploadToS3(logoFile, "uploads/logos");
    if (backgroundFile) finalBackground = await uploadToS3(backgroundFile, "uploads/backgrounds");

    const values = [
      publisher_offer_id, title || "", body.subtitle || "", body.description || "",
      finalHero, finalLogo, finalBackground,
      body.button_text || "Continue", body.verify_button_text || "Confirm",
      body.disclaimer || "", body.theme_color || "#22c55e",
      body.text_color || "#ffffff", body.card_color || "rgba(255,255,255,0.08)",
      body.success_redirect_url || "",
      parseBool(body.show_timer), Number(body.timer_seconds) || 30,
      parseBool(body.show_carrier_logo), parseBool(body.show_geo),
      body.custom_css || "", body.status || "active", body.logo_alt || "",
      parseBool(body.background_blur), parseBool(body.show_disclaimer),
      parseBool(body.show_secure_badge), parseBool(body.show_powered_by),
      parseBool(body.enable_resend_otp), Number(body.resend_timer_seconds) || 30,
      parseBool(body.enable_success_screen),
      body.success_title || "Subscription Successful",
      body.success_message || "Your subscription has been activated successfully.",
      Number(body.redirect_delay_seconds) || 3, parseBool(body.enable_redirect),
      parseBool(body.enable_status_polling),
      Number(body.polling_interval_seconds) || 5, Number(body.max_polling_attempts) || 6,
      parseBool(body.enable_portal_redirect), parseBool(body.rtl_enabled),
      body.language_code || "en", body.font_family || "Inter",
      Number(body.button_radius) || 12, Number(body.card_radius) || 24,
      body.background_overlay || "rgba(0,0,0,0.45)", parseBool(body.animation_enabled),
      body.otp_box_style || "boxed", parseBool(body.maintenance_mode),
      body.maintenance_message || "Service temporarily unavailable",
      Number(body.priority) || 0,
    ];

    const placeholders = values.map((_, i) => `$${i + 1}`).join(",");

    const result = await pool.query(`
      INSERT INTO landing_pages (
        publisher_offer_id, title, subtitle, description,
        image_url, logo_url, background_url,
        button_text, verify_button_text, disclaimer,
        theme_color, text_color, card_color, success_redirect_url,
        show_timer, timer_seconds, show_carrier_logo, show_geo,
        custom_css, status, logo_alt, background_blur,
        show_disclaimer, show_secure_badge, show_powered_by,
        enable_resend_otp, resend_timer_seconds, enable_success_screen,
        success_title, success_message, redirect_delay_seconds, enable_redirect,
        enable_status_polling, polling_interval_seconds, max_polling_attempts,
        enable_portal_redirect, rtl_enabled, language_code, font_family,
        button_radius, card_radius, background_overlay, animation_enabled,
        otp_box_style, maintenance_mode, maintenance_message, priority
      ) VALUES (${placeholders}) RETURNING *
    `, values);

    const landing = result.rows[0];
    const landingUrl = `${FRONTEND_BASE_URL}/landing/${landing.id}`;

    await pool.query(`UPDATE landing_pages SET landing_url=$1 WHERE id=$2`, [landingUrl, landing.id]);

    res.json({ status: "SUCCESS", data: { ...landing, landing_url: landingUrl } });
  } catch (err) {
    console.error("Create Landing Error:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* GET ALL LANDINGS */
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.*, o.service_name AS offer_name, o.portal_url,
        o.has_antifraud, o.has_status_check, o.has_portal_step,
        o.carrier, o.geo,
        p.name AS publisher_name
      FROM landing_pages lp
      LEFT JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      LEFT JOIN offers o ON o.id = po.offer_id
      LEFT JOIN publishers p ON p.id = po.publisher_id
      ORDER BY lp.id DESC
    `);
    res.json({ status: "SUCCESS", data: result.rows });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* GET LANDING BY PUBLISHER NAME — /landing/:publisher/:id */
router.get("/:publisher/:id", async (req, res) => {
  try {
    const { publisher, id } = req.params;

    // Find publisher_offer_id for this landing + publisher combo
    const result = await pool.query(`
      SELECT lp.*, po.offer_id, po.publisher_id, po.publisher_cpa,
        o.service_name, o.geo, o.carrier, o.portal_url, o.otp_length,
        o.has_antifraud, o.has_status_check, o.has_portal_step,
        o.af_trigger_point, o.af_prepare_url, o.check_status_url,
        o.pin_send_url, o.pin_verify_url,
        o.encode_headers_base64, o.encode_ip_base64,
        p.api_key, p.name AS publisher_name
      FROM landing_pages lp
      LEFT JOIN publisher_offers po ON po.offer_id = (
        SELECT po2.offer_id FROM publisher_offers po2
        LEFT JOIN landing_pages lp2 ON lp2.publisher_offer_id = po2.id
        WHERE lp2.id = $1 LIMIT 1
      )
      LEFT JOIN publishers p ON p.id = po.publisher_id
      LEFT JOIN offers o ON o.id = po.offer_id
      WHERE lp.id = $1
        AND LOWER(REPLACE(p.name, ' ', '')) = LOWER(REPLACE($2, ' ', ''))
        AND po.status = 'active'
      LIMIT 1
    `, [id, publisher]);

    if (!result.rows.length) {
      // Fallback: just load landing with original publisher
      return res.redirect(`/api/landing/${id}`);
    }

    const landing = result.rows[0];
    res.json({
      status: "SUCCESS",
      data: {
        ...landing,
        redirect_url: landing.success_redirect_url || landing.portal_url || "",
        antifraud: { enabled: landing.has_antifraud, trigger_point: landing.af_trigger_point, prepare_url: landing.af_prepare_url },
        status_check: { enabled: landing.has_status_check, url: landing.check_status_url },
        portal: { enabled: landing.has_portal_step, url: landing.portal_url },
      }
    });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* GET SINGLE LANDING */
router.get("/:id", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT lp.*, po.offer_id, po.publisher_id, po.publisher_cpa,
        o.service_name, o.geo, o.carrier, o.portal_url, o.otp_length,
        o.has_antifraud, o.has_status_check, o.has_portal_step,
        o.af_trigger_point, o.af_prepare_url, o.check_status_url,
        o.pin_send_url, o.pin_verify_url,
        o.encode_headers_base64, o.encode_ip_base64,
        p.api_key, p.name AS publisher_name
      FROM landing_pages lp
      LEFT JOIN publisher_offers po ON po.id = lp.publisher_offer_id
      LEFT JOIN offers o ON o.id = po.offer_id
      LEFT JOIN publishers p ON p.id = po.publisher_id
      WHERE lp.id = $1 LIMIT 1
    `, [req.params.id]);

    if (!result.rows.length) return res.status(404).json({ status: "FAILED", error: "Landing not found" });

    const landing = result.rows[0];
    res.json({
      status: "SUCCESS",
      data: {
        ...landing,
        redirect_url: landing.success_redirect_url || landing.portal_url || "",
        antifraud: { enabled: landing.has_antifraud, trigger_point: landing.af_trigger_point, prepare_url: landing.af_prepare_url },
        status_check: { enabled: landing.has_status_check, url: landing.check_status_url },
        portal: { enabled: landing.has_portal_step, url: landing.portal_url },
      }
    });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* UPDATE LANDING */
router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    const heroFile = req.files?.heroFile;
    const logoFile = req.files?.logoFile;
    const backgroundFile = req.files?.backgroundFile;

    let finalHero = body.image_url || "";
    let finalLogo = body.logo_url || "";
    let finalBackground = body.background_url || "";

    if (heroFile) finalHero = await uploadToS3(heroFile, "uploads/heroes");
    if (logoFile) finalLogo = await uploadToS3(logoFile, "uploads/logos");
    if (backgroundFile) finalBackground = await uploadToS3(backgroundFile, "uploads/backgrounds");

    const result = await pool.query(`
      UPDATE landing_pages SET
        publisher_offer_id = COALESCE($1, publisher_offer_id),
        title = COALESCE($2, title),
        subtitle = COALESCE($3, subtitle),
        description = COALESCE($4, description),
        image_url = $5, logo_url = $6, background_url = $7,
        button_text = COALESCE($8, button_text),
        verify_button_text = COALESCE($9, verify_button_text),
        theme_color = COALESCE($10, theme_color),
        text_color = COALESCE($11, text_color),
        show_timer = COALESCE($12, show_timer),
        rtl_enabled = COALESCE($13, rtl_enabled),
        language_code = COALESCE($14, language_code),
        status = COALESCE($15, status)
      WHERE id = $16 RETURNING *
    `, [
      body.publisher_offer_id || null, body.title || null,
      body.subtitle || null, body.description || null,
      finalHero || null, finalLogo || null, finalBackground || null,
      body.button_text || null, body.verify_button_text || null,
      body.theme_color || null, body.text_color || null,
      body.show_timer === "true" ? true : body.show_timer === "false" ? false : null,
      body.rtl_enabled === "true" ? true : body.rtl_enabled === "false" ? false : null,
      body.language_code || null, body.status || null, id,
    ]);

    if (!result.rows.length) return res.status(404).json({ status: "FAILED", error: "Landing not found" });
    res.json({ status: "SUCCESS", data: result.rows[0] });
  } catch (err) {
    console.error("UPDATE LANDING ERROR:", err);
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

/* DELETE LANDING */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query(`DELETE FROM landing_pages WHERE id=$1`, [req.params.id]);
    res.json({ status: "SUCCESS", message: "Landing deleted" });
  } catch (err) {
    res.status(500).json({ status: "FAILED", error: err.message });
  }
});

export default router;
