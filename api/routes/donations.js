const express = require("express");

const { siteBaseUrl, stripe } = require("../config");
const {
  DONATION_DESCRIPTION,
  DONATION_PRODUCT_NAME,
  formatUsd,
  getSiteBaseUrl,
  parseAmountCents
} = require("../lib/donations");

const router = express.Router();

router.post("/checkout-session", async (req, res) => {
  const amountCents = parseAmountCents(req.body?.amountCents);

  if (!amountCents) {
    return res.status(400).json({
      error: "Choose a donation amount between $5 and $5,000."
    });
  }

  try {
    const frontendBaseUrl = getSiteBaseUrl(req, siteBaseUrl);
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
      success_url: `${frontendBaseUrl}/thank-you.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/?donation=cancel#donate`
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

router.get("/session-status", async (req, res) => {
  const sessionId =
    typeof req.query.session_id === "string" ? req.query.session_id : "";

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

module.exports = router;
