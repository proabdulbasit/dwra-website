require("dotenv").config({ quiet: true });

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const Stripe = require("stripe");

const app = express();
const rootDir = __dirname;
const port = /^\d+$/.test(String(process.env.PORT || ""))
  ? Number(process.env.PORT)
  : 3000;
const allowedOrigins = Array.from(
  new Set(
    [
      process.env.BASE_URL,
      "http://127.0.0.1:5500",
      "http://localhost:5500"
    ].filter(Boolean)
  )
);

const MIN_DONATION_CENTS = 500;
const MAX_DONATION_CENTS = 500000;
const DONATION_PRODUCT_NAME = "Donation to DWRA Foundation";
const DONATION_DESCRIPTION =
  "Support health insurance and medical care access for children in Ghana.";

if (!process.env.SECRET_KEY) {
  throw new Error("Missing SECRET_KEY in environment variables.");
}

const stripe = new Stripe(process.env.SECRET_KEY);

const contentSecurityPolicy = {
  useDefaults: true,
  directives: {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "https:"],
    "connect-src": ["'self'"],
    "font-src": ["'self'", "data:", "https:"],
    "frame-ancestors": ["'self'"],
    "object-src": ["'none'"]
  }
};

if (process.env.NODE_ENV === "production") {
  contentSecurityPolicy.directives["upgrade-insecure-requests"] = [];
}

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy
  })
);
app.use((req, res, next) => {
  const origin = req.get("origin");

  if (origin && allowedOrigins.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
    res.set("Vary", "Origin");
    res.set("Access-Control-Allow-Headers", "Content-Type, Accept");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  }

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  return next();
});
app.use(express.json({ limit: "10kb" }));
app.use(
  "/assets",
  express.static(path.join(rootDir, "assets"), {
    immutable: true,
    maxAge: "30d"
  })
);

function toBaseUrl(req) {
  if (process.env.BASE_URL) {
    return process.env.BASE_URL.replace(/\/+$/, "");
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const protocol = forwardedProto ? forwardedProto.split(",")[0] : req.protocol;
  return `${protocol}://${req.get("host")}`;
}

function parseAmountCents(value) {
  const amount = Number(value);
  if (!Number.isInteger(amount)) {
    return null;
  }

  if (amount < MIN_DONATION_CENTS || amount > MAX_DONATION_CENTS) {
    return null;
  }

  return amount;
}

function formatUsd(cents) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

app.post("/api/donations/checkout-session", async (req, res) => {
  const amountCents = parseAmountCents(req.body?.amountCents);

  if (!amountCents) {
    return res.status(400).json({
      error: "Choose a donation amount between $5 and $5,000."
    });
  }

  try {
    const baseUrl = toBaseUrl(req);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      submit_type: "donate",
      billing_address_collection: "auto",
      customer_creation: "always",
      locale: "auto",
      name_collection: {
        individual: {
          enabled: true
        }
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: amountCents,
            product_data: {
              name: DONATION_PRODUCT_NAME,
              description: DONATION_DESCRIPTION
            }
          }
        }
      ],
      payment_intent_data: {
        description: `DWRA Foundation website donation (${formatUsd(amountCents)})`,
        metadata: {
          amount_cents: String(amountCents),
          campaign: "general_fund",
          source: "website"
        }
      },
      metadata: {
        amount_cents: String(amountCents),
        campaign: "general_fund",
        source: "website"
      },
      custom_text: {
        submit: {
          message:
            "Your donation helps support healthcare access for children in Ghana."
        }
      },
      success_url: `${baseUrl}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/?donation=cancel#donate`
    });

    return res.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session error:", error);
    return res.status(500).json({
      error:
        "We couldn't start the donation checkout right now. Please try again in a moment."
    });
  }
});

app.get("/api/donations/session-status", async (req, res) => {
  const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : "";

  if (!sessionId.startsWith("cs_")) {
    return res.status(400).json({ error: "Invalid session ID." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.set("Cache-Control", "no-store");
    return res.json({
      amountTotalCents: session.amount_total || 0,
      customerName: session.customer_details?.name || "",
      paymentStatus: session.payment_status
    });
  } catch (error) {
    console.error("Stripe session lookup error:", error);
    return res.status(500).json({
      error:
        "We couldn't verify that donation yet. Please check your Stripe receipt or contact DWRA."
    });
  }
});

app.use("/api", (_req, res) => {
  return res.status(404).json({
    error:
      "Donation API route not found. Make sure the site is running through the Node server."
  });
});

app.use((error, _req, res, _next) => {
  console.error("Server error:", error);

  if (error instanceof SyntaxError && error.status === 400 && "body" in error) {
    return res.status(400).json({
      error: "Invalid request payload."
    });
  }

  return res.status(500).json({
    error: "Unexpected server error."
  });
});

function sendHome(_req, res) {
  res.sendFile(path.join(rootDir, "index.html"));
}

function sendThankYou(_req, res) {
  res.sendFile(path.join(rootDir, "thank-you.html"));
}

app.get("/", sendHome);
app.get("/index.html", sendHome);
app.get("/thank-you.html", sendThankYou);

app.listen(port, () => {
  console.log(`DWRA site running on http://localhost:${port}`);
});
