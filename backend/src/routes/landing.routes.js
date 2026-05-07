import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();

const FRONTEND_BASE_URL = "https://dashboard.mob13r.com";
const BACKEND_BASE_URL = "https://backend.mob13r.com";

/* =========================
   UPLOAD DIRECTORIES
========================= */

const UPLOAD_BASE = path.join(process.cwd(), "public/uploads/landings");

const DIRS = {
  logos: path.join(UPLOAD_BASE, "logos"),
  backgrounds: path.join(UPLOAD_BASE, "backgrounds"),
  heroes: path.join(UPLOAD_BASE, "heroes"),
};

Object.values(DIRS).forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/* =========================
   HELPERS
========================= */

const allowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];

const validateImage = (file) => {
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return "Invalid image format";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "Image size exceeds 5MB";
  }

  return null;
};

const saveFile = async (file, folder) => {
  const ext = path.extname(file.name);

  const fileName =
    `${folder}_${Date.now()}_${Math.floor(Math.random() * 999999)}${ext}`;

  const savePath = path.join(DIRS[folder], fileName);

  await file.mv(savePath);

  return `${BACKEND_BASE_URL}/uploads/landings/${folder}/${fileName}`;
};

/* =========================
   GET PUBLISHER OFFERS
========================= */

router.get("/publisher-offers", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        po.id,
        po.offer_id,
        p.name AS publisher_name,
        o.service_name,
        o.geo,
        o.carrier
      FROM publisher_offers po
      LEFT JOIN publishers p
        ON p.id = po.publisher_id
      LEFT JOIN offers o
        ON o.id = po.offer_id
      WHERE po.status='active'
      ORDER BY po.id DESC
    `);

    res.json({
      status: "SUCCESS",
      data: result.rows,
    });
  } catch (err) {
    console.error("Publisher Offers Error:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message,
    });
  }
});

/* =========================
   CREATE LANDING
========================= */

router.post("/", async (req, res) => {
  try {
    const {
      publisher_offer_id,
      title,
      subtitle,
      description,

      image_url,
      logo_url,
      background_url,

      button_text,
      verify_button_text,

      disclaimer,

      theme_color,
      text_color,
      card_color,

      success_redirect_url,

      show_timer,
      timer_seconds,

      show_carrier_logo,
      show_geo,

      custom_css,

      status,

      logo_alt,

      background_blur,

      show_disclaimer,
      show_secure_badge,
      show_powered_by,

      enable_resend_otp,
      resend_timer_seconds,

      enable_success_screen,

      success_title,
      success_message,

      redirect_delay_seconds,
      enable_redirect,

      enable_status_polling,
      polling_interval_seconds,
      max_polling_attempts,

      enable_portal_redirect,

      rtl_enabled,
      language_code,

      font_family,

      button_radius,
      card_radius,

      background_overlay,

      animation_enabled,

      otp_box_style,

      maintenance_mode,
      maintenance_message,

      priority,
    } = req.body;

    if (!publisher_offer_id || !title) {
      return res.status(400).json({
        status: "FAILED",
        error: "publisher_offer_id and title are required",
      });
    }

    let finalHero = image_url || "";
    let finalLogo = logo_url || "";
    let finalBackground = background_url || "";

    /* =========================
       HERO IMAGE
    ========================= */

    if (req.files?.heroFile) {
      const heroFile = req.files.heroFile;

      const err = validateImage(heroFile);

      if (err) {
        return res.status(400).json({
          status: "FAILED",
          error: err,
        });
      }

      finalHero = await saveFile(heroFile, "heroes");
    }

    /* =========================
       LOGO IMAGE
    ========================= */

    if (req.files?.logoFile) {
      const logoFile = req.files.logoFile;

      const err = validateImage(logoFile);

      if (err) {
        return res.status(400).json({
          status: "FAILED",
          error: err,
        });
      }

      finalLogo = await saveFile(logoFile, "logos");
    }

    /* =========================
       BACKGROUND IMAGE
    ========================= */

    if (req.files?.backgroundFile) {
      const bgFile = req.files.backgroundFile;

      const err = validateImage(bgFile);

      if (err) {
        return res.status(400).json({
          status: "FAILED",
          error: err,
        });
      }

      finalBackground = await saveFile(bgFile, "backgrounds");
    }

    /* =========================
       INSERT LANDING
    ========================= */

    const result = await pool.query(
      `
      INSERT INTO landing_pages (

        publisher_offer_id,

        title,
        subtitle,
        description,

        image_url,
        logo_url,
        background_url,

        button_text,
        verify_button_text,

        disclaimer,

        theme_color,
        text_color,
        card_color,

        success_redirect_url,

        show_timer,
        timer_seconds,

        show_carrier_logo,
        show_geo,

        custom_css,

        status,

        logo_alt,

        background_blur,

        show_disclaimer,
        show_secure_badge,
        show_powered_by,

        enable_resend_otp,
        resend_timer_seconds,

        enable_success_screen,

        success_title,
        success_message,

        redirect_delay_seconds,
        enable_redirect,

        enable_status_polling,
        polling_interval_seconds,
        max_polling_attempts,

        enable_portal_redirect,

        rtl_enabled,
        language_code,

        font_family,

        button_radius,
        card_radius,

        background_overlay,

        animation_enabled,

        otp_box_style,

        maintenance_mode,
        maintenance_message,

        priority

      )

      VALUES (

        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27,$28,$29,$30,
        $31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49

      )

      RETURNING *
      `,
      [
        publisher_offer_id,

        title || "",
        subtitle || "",
        description || "",

        finalHero,
        finalLogo,
        finalBackground,

        button_text || "Continue",
        verify_button_text || "Confirm",

        disclaimer || "",

        theme_color || "#22c55e",
        text_color || "#ffffff",
        card_color || "rgba(255,255,255,0.08)",

        success_redirect_url || "",

        show_timer ?? true,
        timer_seconds || 30,

        show_carrier_logo ?? true,
        show_geo ?? true,

        custom_css || "",

        status || "active",

        logo_alt || "",

        background_blur ?? true,

        show_disclaimer ?? true,
        show_secure_badge ?? true,
        show_powered_by ?? false,

        enable_resend_otp ?? true,
        resend_timer_seconds || 30,

        enable_success_screen ?? true,

        success_title || "Subscription Successful",
        success_message ||
          "Your subscription has been activated successfully.",

        redirect_delay_seconds || 3,
        enable_redirect ?? true,

        enable_status_polling ?? false,
        polling_interval_seconds || 5,
        max_polling_attempts || 6,

        enable_portal_redirect ?? false,

        rtl_enabled ?? false,
        language_code || "en",

        font_family || "Inter",

        button_radius || 12,
        card_radius || 24,

        background_overlay || "rgba(0,0,0,0.45)",

        animation_enabled ?? true,

        otp_box_style || "boxed",

        maintenance_mode ?? false,
        maintenance_message || "Service temporarily unavailable",

        priority || 0,
      ]
    );

    res.json({
      status: "SUCCESS",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Create Landing Error:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message,
    });
  }
});

/* =========================
   GET ALL LANDINGS
========================= */

router.get("/", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        lp.*,
        o.service_name AS offer_name,
        p.name AS publisher_name

      FROM landing_pages lp

      LEFT JOIN publisher_offers po
        ON po.id = lp.publisher_offer_id

      LEFT JOIN offers o
        ON o.id = po.offer_id

      LEFT JOIN publishers p
        ON p.id = po.publisher_id

      ORDER BY lp.id DESC
    `);

    res.json({
      status: "SUCCESS",
      data: result.rows,
    });
  } catch (err) {
    console.error("Get Landings Error:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message,
    });
  }
});

/* =========================
   GET SINGLE LANDING
========================= */

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT

        lp.*,

        po.offer_id,

        o.service_name,
        o.geo,
        o.carrier,
        o.redirect_url,
        o.otp_length,

        o.has_antifraud,
        o.has_status_check,
        o.has_portal_step,

        p.api_key

      FROM landing_pages lp

      LEFT JOIN publisher_offers po
        ON po.id = lp.publisher_offer_id

      LEFT JOIN offers o
        ON o.id = po.offer_id

      LEFT JOIN publishers p
        ON p.id = po.publisher_id

      WHERE lp.id=$1

      LIMIT 1
      `,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        status: "FAILED",
        error: "Landing not found",
      });
    }

    res.json({
      status: "SUCCESS",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Get Landing Error:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message,
    });
  }
});

/* =========================
   DELETE LANDING
========================= */

router.delete("/:id", async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM landing_pages WHERE id=$1`,
      [req.params.id]
    );

    res.json({
      status: "SUCCESS",
      message: "Landing deleted",
    });
  } catch (err) {
    console.error("Delete Landing Error:", err);

    res.status(500).json({
      status: "FAILED",
      error: err.message,
    });
  }
});

export default router;
