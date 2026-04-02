const MIN_DONATION_CENTS = 500;
const MAX_DONATION_CENTS = 500000;
const DONATION_PRODUCT_NAME = "Donation to DWRA Foundation";
const DONATION_DESCRIPTION =
  "Support health insurance and medical care access for children in Ghana.";

function getSiteBaseUrl(req, configuredBaseUrl) {
  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const origin = req.get("origin");
  if (origin) {
    return origin.replace(/\/+$/, "");
  }

  const forwardedProto = req.get("x-forwarded-proto");
  const forwardedHost = req.get("x-forwarded-host");
  const protocol = forwardedProto ? forwardedProto.split(",")[0] : req.protocol;
  const host = forwardedHost ? forwardedHost.split(",")[0] : req.get("host");

  return `${protocol}://${host}`;
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

module.exports = {
  DONATION_DESCRIPTION,
  DONATION_PRODUCT_NAME,
  MAX_DONATION_CENTS,
  MIN_DONATION_CENTS,
  formatUsd,
  getSiteBaseUrl,
  parseAmountCents
};
