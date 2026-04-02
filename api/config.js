const path = require("path");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
  quiet: true
});

const Stripe = require("stripe");

const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:5500",
  "http://localhost:5500"
];

const port = /^\d+$/.test(String(process.env.PORT || ""))
  ? Number(process.env.PORT)
  : 4242;

const siteBaseUrl =
  typeof process.env.BASE_URL === "string"
    ? process.env.BASE_URL.replace(/\/+$/, "")
    : "";

const allowedOrigins = Array.from(
  new Set([siteBaseUrl, ...DEFAULT_ALLOWED_ORIGINS].filter(Boolean))
);

if (!process.env.SECRET_KEY) {
  throw new Error("Missing SECRET_KEY in environment variables.");
}

const stripe = new Stripe(process.env.SECRET_KEY);

module.exports = {
  allowedOrigins,
  port,
  siteBaseUrl,
  stripe
};
