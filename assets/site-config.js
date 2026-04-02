window.DWRA_SITE_CONFIG = {
  // Public site URL where the HTML files are served.
  siteBaseUrl: "http://127.0.0.1:5500",
  // API URL where the Node/Stripe backend runs.
  apiBaseUrl: "https://dwra-backend.onrender.com",
  // Public Stripe Payment Link used as a static-site fallback.
  // This test-mode link now redirects to the site's thank-you page at BASE_URL after payment.
  // Replace this with a live-mode link after you switch from Stripe test keys to live keys.
  stripePaymentLinkUrl: "https://donate.stripe.com/test_fZu14g5WQaII8mF0Wd18c02"
};
