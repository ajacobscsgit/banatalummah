"use strict";

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const Stripe = require("stripe");

const app = express();

const PORT = Number(process.env.PORT || 4242);

const SECRET_KEY = process.env.STRIPE_SECRET_KEY || "";
const PUBLISHABLE_KEY = process.env.STRIPE_PUBLISHABLE_KEY || "";
const FRONTEND_URL = process.env.FRONTEND_URL || "";

const PAYMENT_MODE = process.env.PAYMENT_MODE || "test";

if (!["test", "live"].includes(PAYMENT_MODE)) {
  console.error("PAYMENT_MODE must be test or live.");
  process.exit(1);
}

const expectedSecretPrefix =
  PAYMENT_MODE === "live" ? "sk_live_" : "sk_test_";

const expectedPublicPrefix =
  PAYMENT_MODE === "live" ? "pk_live_" : "pk_test_";

if (
  !SECRET_KEY.startsWith(expectedSecretPrefix) ||
  !PUBLISHABLE_KEY.startsWith(expectedPublicPrefix) ||
  SECRET_KEY.includes("REPLACE_ME") ||
  PUBLISHABLE_KEY.includes("REPLACE_ME")
) {
  console.error(
    `Add matching ${PAYMENT_MODE} Stripe keys to your environment variables.`
  );

  process.exit(1);
}

let frontend;

try {
  frontend = new URL(FRONTEND_URL);
} catch {
  console.error(
    "FRONTEND_URL must be a complete URL, such as http://127.0.0.1:5500"
  );

  process.exit(1);
}

const stripe = new Stripe(SECRET_KEY, {
  apiVersion: "2026-10-28.endive"
});

app.disable("x-powered-by");

// Allow requests from your website preview.
// This does not replace authentication or production abuse protection.
app.use(
  cors({
    origin: frontend.origin,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"]
  })
);

app.use(express.json({ limit: "10kb" }));

// Avoid caching API responses containing payment session information.
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/* ------------------------------------------
   Check whether the server is running
------------------------------------------ */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mode: PAYMENT_MODE
  });
});

/* ------------------------------------------
   Share only the public Stripe key
------------------------------------------ */

app.get("/api/config", (req, res) => {
  res.json({
    publishableKey: PUBLISHABLE_KEY,
    mode: PAYMENT_MODE
  });
});

/* ------------------------------------------
   Create a Checkout Session
------------------------------------------ */

app.post("/api/create-checkout-session", async (req, res) => {
  // The frontend will send an integer number of cents.
  // Examples: $25 = 2500, $75.50 = 7550.
  const amountInCents = req.body?.amountInCents;

  // Validate again on the server.
  // Browser validation alone cannot protect payment amounts.
  if (
    !Number.isSafeInteger(amountInCents) ||
    amountInCents < 100 ||
    amountInCents > 1000000
  ) {
    return res.status(400).json({
      error: "Choose an amount between $1 and $10,000."
    });
  }

  try {
    const returnURL = new URL("donate.html", frontend);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",

      // Matches your Checkout Studio configuration.
      ui_mode: "form",

      line_items: [
        {
          price_data: {
            currency: "usd",

            product_data: {
              name: "Banāt al-Ummah Educational Journey",

              description:
                "A voluntary contribution toward our planned " +
                "Arabic and Qur’an studies, travel, accommodation, " +
                "and educational retreat."
            },

            unit_amount: amountInCents
          },

          quantity: 1
        }
      ],

      billing_address_collection: "auto",

      phone_number_collection: {
        enabled: false
      },

      automatic_tax: {
        enabled: false
      },

      submit_type: "donate",

      name_collection: {
        individual: {
          enabled: true
        }
      },

      integration_identifier: "custom_embedded_web_0001",

      return_url:
        returnURL.href +
        "?session_id={CHECKOUT_SESSION_ID}"
    });

    if (!session.client_secret) {
      throw new Error("Stripe did not return a client secret.");
    }

    res.json({
      client_secret: session.client_secret
    });
  } catch (error) {
    const message = String(error.message || "Unknown Stripe error")
      .replace(
        /\b(?:sk|pk|rk)_(?:test|live)_[A-Za-z0-9_]+/g,
        "[KEY REMOVED]"
      );

    console.error("Checkout creation failed:", message);

    res.status(500).json({
      error: "Unable to open checkout. Please try again shortly."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});