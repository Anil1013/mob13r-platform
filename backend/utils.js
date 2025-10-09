// utils.js — Mob13r Affiliate Platform Utilities
// ----------------------------------------------

const crypto = require("crypto");
const jwt = require("jsonwebtoken");
require("dotenv").config();

// Generate random transaction ID
function generateTxID(length = 16) {
  return crypto.randomBytes(length).toString("hex").slice(0, length);
}

// Generate JWT Token
function generateToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET || "mob13r_secret_key", {
    expiresIn: "7d",
  });
}

// Verify JWT Token
function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET || "mob13r_secret_key");
  } catch (err) {
    return null;
  }
}

// Format API Response
function apiResponse(success, message, data = {}) {
  return { success, message, data };
}

// PostgreSQL Connection Helper
function getPostgresURI() {
  const user = process.env.DB_USER || "postgres";
  const pass = process.env.DB_PASS || "password";
  const host = process.env.DB_HOST || "localhost";
  const port = process.env.DB_PORT || 5432;
  const name = process.env.DB_NAME || "mob13r_affiliate";

  return `postgresql://${user}:${pass}@${host}:${port}/${name}`;
}

module.exports = {
  generateTxID,
  generateToken,
  verifyToken,
  apiResponse,
  getPostgresURI,
};
