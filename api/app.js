const express = require("express");
const helmet = require("helmet");

const { allowedOrigins } = require("./config");
const donationsRouter = require("./routes/donations");

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: false
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

app.use("/api/donations", donationsRouter);

app.use("/api", (_req, res) => {
  return res.status(404).json({
    error: "API route not found."
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

module.exports = app;
