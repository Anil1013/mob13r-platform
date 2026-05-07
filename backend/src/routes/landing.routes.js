import express from "express";
import pool from "../db.js";
import path from "path";
import fs from "fs";

const router = express.Router();

const FRONTEND_BASE_URL =
  "https://dashboard.mob13r.com";

const BACKEND_BASE_URL =
  "https://backend.mob13r.com";

/* =========================================
   DIRECTORIES
========================================= */

const UPLOAD_BASE = path.join(
  process.cwd(),
  "public/uploads/landings"
);

const DIRS = {
  logos: path.join(
    UPLOAD_BASE,
    "logos"
  ),

  backgrounds: path.join(
    UPLOAD_BASE,
    "backgrounds"
  ),

  heroes: path.join(
    UPLOAD_BASE,
    "heroes"
  ),
};

Object.values(DIRS).forEach(
  (dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true,
      });
    }
  }
);

/* =========================================
   HELPERS
========================================= */

const allowedMimeTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/svg+xml",
];

const parseBool = (v) =>
  v === true || v === "true";

const validateImage = (
  file
) => {
  if (!file) return null;

  if (
    !allowedMimeTypes.includes(
      file.mimetype
    )
  ) {
    return "Invalid image format";
  }

  if (
    file.size >
    10 * 1024 * 1024
  ) {
    return "Image exceeds 10MB";
  }

  return null;
};

const saveFile = async (
  file,
  folder
) => {
  const ext =
    path.extname(file.name);

  const fileName =
    `${folder}_${Date.now()}_${Math.floor(
      Math.random() *
        999999
    )}${ext}`;

  const savePath =
    path.join(
      DIRS[folder],
      fileName
    );

  await file.mv(savePath);

  return `${BACKEND_BASE_URL}/uploads/landings/${folder}/${fileName}`;
};

/* =========================================
   GET PUBLISHER OFFERS
========================================= */

router.get(
  "/publisher-offers",
  async (req, res) => {
    try {
      const result =
        await pool.query(`
        SELECT
          po.id,
          po.offer_id,
          po.publisher_cpa,

          p.name AS publisher_name,

          o.service_name,
          o.geo,
          o.carrier,
          o.portal_url,

          o.has_antifraud,
          o.has_status_check,
          o.has_portal_step

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
      console.error(
        "Publisher Offers Error:",
        err
      );

      res.status(500).json({
        status: "FAILED",
        error: err.message,
      });
    }
  }
);

/* =========================================
   CREATE LANDING
========================================= */

router.post(
  "/",
  async (req, res) => {
    try {
      const body =
        req.body || {};

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

        timer_seconds,

        custom_css,

        status,

        logo_alt,

        resend_timer_seconds,

        success_title,
        success_message,

        redirect_delay_seconds,

        polling_interval_seconds,
        max_polling_attempts,

        language_code,

        font_family,

        button_radius,
        card_radius,

        background_overlay,

        otp_box_style,

        maintenance_message,

        priority,
      } = body;

      if (
        !publisher_offer_id ||
        !title
      ) {
        return res
          .status(400)
          .json({
            status:
              "FAILED",
            error:
              "publisher_offer_id and title required",
          });
      }

      /* =====================================
         FILES
      ===================================== */

      const heroFile =
        req.files
          ?.heroFile;

      const logoFile =
        req.files
          ?.logoFile;

      const backgroundFile =
        req.files
          ?.backgroundFile;

      /* =====================================
         VALIDATION
      ===================================== */

      const heroError =
        validateImage(
          heroFile
        );

      if (heroError) {
        return res
          .status(400)
          .json({
            status:
              "FAILED",
            error:
              heroError,
          });
      }

      const logoError =
        validateImage(
          logoFile
        );

      if (logoError) {
        return res
          .status(400)
          .json({
            status:
              "FAILED",
            error:
              logoError,
          });
      }

      const bgError =
        validateImage(
          backgroundFile
        );

      if (bgError) {
        return res
          .status(400)
          .json({
            status:
              "FAILED",
            error:
              bgError,
          });
      }

      /* =====================================
         UPLOADS
      ===================================== */

      let finalHero =
        image_url || "";

      let finalLogo =
        logo_url || "";

      let finalBackground =
        background_url ||
        "";

      if (heroFile) {
        finalHero =
          await saveFile(
            heroFile,
            "heroes"
          );
      }

      if (logoFile) {
        finalLogo =
          await saveFile(
            logoFile,
            "logos"
          );
      }

      if (
        backgroundFile
      ) {
        finalBackground =
          await saveFile(
            backgroundFile,
            "backgrounds"
          );
      }

      /* =====================================
         VALUES
      ===================================== */

      const values = [
        publisher_offer_id,

        title || "",
        subtitle || "",
        description || "",

        finalHero,
        finalLogo,
        finalBackground,

        button_text ||
          "Continue",

        verify_button_text ||
          "Confirm",

        disclaimer || "",

        theme_color ||
          "#22c55e",

        text_color ||
          "#ffffff",

        card_color ||
          "rgba(255,255,255,0.08)",

        success_redirect_url ||
          "",

        parseBool(
          body.show_timer
        ),

        Number(
          timer_seconds
        ) || 30,

        parseBool(
          body.show_carrier_logo
        ),

        parseBool(
          body.show_geo
        ),

        custom_css || "",

        status ||
          "active",

        logo_alt || "",

        parseBool(
          body.background_blur
        ),

        parseBool(
          body.show_disclaimer
        ),

        parseBool(
          body.show_secure_badge
        ),

        parseBool(
          body.show_powered_by
        ),

        parseBool(
          body.enable_resend_otp
        ),

        Number(
          resend_timer_seconds
        ) || 30,

        parseBool(
          body.enable_success_screen
        ),

        success_title ||
          "Subscription Successful",

        success_message ||
          "Your subscription has been activated successfully.",

        Number(
          redirect_delay_seconds
        ) || 3,

        parseBool(
          body.enable_redirect
        ),

        parseBool(
          body.enable_status_polling
        ),

        Number(
          polling_interval_seconds
        ) || 5,

        Number(
          max_polling_attempts
        ) || 6,

        parseBool(
          body.enable_portal_redirect
        ),

        parseBool(
          body.rtl_enabled
        ),

        language_code ||
          "en",

        font_family ||
          "Inter",

        Number(
          button_radius
        ) || 12,

        Number(
          card_radius
        ) || 24,

        background_overlay ||
          "rgba(0,0,0,0.45)",

        parseBool(
          body.animation_enabled
        ),

        otp_box_style ||
          "boxed",

        parseBool(
          body.maintenance_mode
        ),

        maintenance_message ||
          "Service temporarily unavailable",

        Number(priority) ||
          0,
      ];

      const placeholders =
        values
          .map(
            (_, i) =>
              `$${i + 1}`
          )
          .join(",");

      /* =====================================
         INSERT
      ===================================== */

      const result =
        await pool.query(
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

        VALUES (${placeholders})

        RETURNING *
      `,
          values
        );

      const landing =
        result.rows[0];

      const landingUrl =
        `${FRONTEND_BASE_URL}/landing/${landing.id}`;

      await pool.query(
        `
        UPDATE landing_pages
        SET landing_url=$1
        WHERE id=$2
      `,
        [
          landingUrl,
          landing.id,
        ]
      );

      res.json({
        status: "SUCCESS",

        data: {
          ...landing,

          landing_url:
            landingUrl,
        },
      });
    } catch (err) {
      console.error(
        "Create Landing Error:",
        err
      );

      res.status(500).json({
        status: "FAILED",
        error:
          err.message,
      });
    }
  }
);

/* =========================================
   GET ALL LANDINGS
========================================= */

router.get(
  "/",
  async (req, res) => {
    try {
      const result =
        await pool.query(`
        SELECT

          lp.*,

          o.service_name AS offer_name,

          o.portal_url,

          o.has_antifraud,
          o.has_status_check,
          o.has_portal_step,

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
      console.error(
        "Get All Landings Error:",
        err
      );

      res.status(500).json({
        status: "FAILED",
        error:
          err.message,
      });
    }
  }
);

/* =========================================
   GET SINGLE LANDING
========================================= */

router.get(
  "/:id",
  async (req, res) => {
    try {
      const result =
        await pool.query(
          `
        SELECT

          lp.*,

          po.offer_id,
          po.publisher_id,
          po.publisher_cpa,

          o.service_name,
          o.geo,
          o.carrier,

          o.portal_url,
          o.otp_length,

          o.has_antifraud,
          o.has_status_check,
          o.has_portal_step,

          o.af_trigger_point,
          o.af_prepare_url,

          o.check_status_url,

          o.pin_send_url,
          o.pin_verify_url,

          o.encode_headers_base64,
          o.encode_ip_base64,

          p.api_key,
          p.name AS publisher_name

        FROM landing_pages lp

        LEFT JOIN publisher_offers po
          ON po.id = lp.publisher_offer_id

        LEFT JOIN offers o
          ON o.id = po.offer_id

        LEFT JOIN publishers p
          ON p.id = po.publisher_id

        WHERE lp.id = $1

        LIMIT 1
      `,
          [req.params.id]
        );

      if (
        !result.rows.length
      ) {
        return res
          .status(404)
          .json({
            status:
              "FAILED",
            error:
              "Landing not found",
          });
      }

      const landing =
        result.rows[0];

      /* =====================================
         FINAL RESPONSE
      ===================================== */

      res.json({
        status: "SUCCESS",

        data: {
          ...landing,

          redirect_url:
            landing.success_redirect_url ||
            landing.portal_url ||
            "",

          antifraud: {
            enabled:
              landing.has_antifraud,

            trigger_point:
              landing.af_trigger_point,

            prepare_url:
              landing.af_prepare_url,
          },

          status_check: {
            enabled:
              landing.has_status_check,

            url:
              landing.check_status_url,
          },

          portal: {
            enabled:
              landing.has_portal_step,

            url:
              landing.portal_url,
          },
        },
      });
    } catch (err) {
      console.error(
        "GET SINGLE LANDING ERROR:",
        err
      );

      res.status(500).json({
        status: "FAILED",
        error:
          err.message,
      });
    }
  }
);

/* =========================================
   DELETE LANDING
========================================= */

router.delete(
  "/:id",
  async (req, res) => {
    try {
      await pool.query(
        `
        DELETE FROM landing_pages
        WHERE id=$1
      `,
        [req.params.id]
      );

      res.json({
        status: "SUCCESS",
        message:
          "Landing deleted",
      });
    } catch (err) {
      console.error(
        "Delete Landing Error:",
        err
      );

      res.status(500).json({
        status: "FAILED",
        error:
          err.message,
      });
    }
  }
);

export default router;
