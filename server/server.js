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
  !(
    SECRET_KEY.startsWith(expectedSecretPrefix) ||
    SECRET_KEY.startsWith(`rk_${PAYMENT_MODE}_`)
  ) ||
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

const CAMPAIGN_ID = "banat-summer-2027";
const GOAL_IN_CENTS = 3000000;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || "";

let progressCache = null;
let progressExpiresAt = 0;
let progressRequest = null;
let progressGeneration = 0;

function invalidateProgress() {
  progressGeneration += 1;
  progressExpiresAt = 0;
}

async function readProgress() {
  if (progressCache && Date.now() < progressExpiresAt) {
    return progressCache;
  }

  if (progressRequest) return progressRequest;

  const generation = progressGeneration;

  progressRequest = (async () => {
    let raisedInCents = 0;
    let contributionCount = 0;

    // The public goal always counts LIVE payments only.
    // A test backend never exposes sandbox payments as real donations.
    if (PAYMENT_MODE === "live") {
      const payments = stripe.paymentIntents.list({
        limit: 100,
        expand: ["data.latest_charge"]
      });

      for await (const payment of payments) {
        if (
          payment.metadata?.campaign !== CAMPAIGN_ID ||
          !payment.livemode ||
          payment.currency !== "usd" ||
          payment.status !== "succeeded"
        ) {
          continue;
        }

        const charge = payment.latest_charge;

        if (
          !charge ||
          typeof charge === "string" ||
          !charge.paid ||
          !charge.captured ||
          charge.disputed
        ) {
          continue;
        }

        const remaining = Math.max(
          0,
          charge.amount_captured - charge.amount_refunded
        );

        if (remaining > 0) {
          raisedInCents += remaining;
          contributionCount += 1;
        }
      }
    }

    const result = {
      goalInCents: GOAL_IN_CENTS,
      raisedInCents,
      contributionCount,
      updatedAt: new Date().toISOString()
    };

    progressCache = result;

    // If a webhook arrived during this calculation,
    // force the next request to refresh again.
    progressExpiresAt =
      generation === progressGeneration ? Date.now() + 60000 : 0;

    return result;
  })();

  try {
    return await progressRequest;
  } finally {
    progressRequest = null;
  }
}

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

app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  (req, res) => {
    if (!WEBHOOK_SECRET) {
      return res.sendStatus(503);
    }

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        WEBHOOK_SECRET
      );
    } catch {
      return res.status(400).send("Invalid webhook signature.");
    }

    if (event.livemode !== (PAYMENT_MODE === "live")) {
      return res.sendStatus(400);
    }

    const relevantEvents = new Set([
      "checkout.session.completed",
      "checkout.session.async_payment_succeeded",
      "checkout.session.async_payment_failed",
      "payment_intent.succeeded",
      "charge.refunded",
      "charge.dispute.created",
      "charge.dispute.closed"
    ]);

    if (relevantEvents.has(event.type)) {
      invalidateProgress();
    }

    // Totals are recalculated from Stripe, so repeated event deliveries
    // cannot double-count contributions.
    return res.json({ received: true });
  }
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

      metadata: {
        campaign: CAMPAIGN_ID
      },

      payment_intent_data: {
        metadata: {
          campaign: CAMPAIGN_ID
        }
      },

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
      client_secret: session.client_secret,
      session_id: session.id
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

app.get("/api/progress", async (req, res) => {
  try {
    res.json(await readProgress());
  } catch (error) {
    console.error("Progress lookup failed:", error.type || "Unknown error");

    res.status(503).json({
      error: "The fundraising total is temporarily unavailable."
    });
  }
});

app.get("/api/session-status", async (req, res) => {
  const sessionId = req.query.session_id;

  if (
    typeof sessionId !== "string" ||
    !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)
  ) {
    return res.status(400).json({
      error: "Invalid payment reference."
    });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(
      sessionId,
      { expand: ["payment_intent.latest_charge"] }
    );

    if (
      session.metadata?.campaign !== CAMPAIGN_ID ||
      session.livemode !== (PAYMENT_MODE === "live") ||
      session.currency !== "usd"
    ) {
      return res.status(404).json({
        error: "Payment reference not found."
      });
    }

    const payment = session.payment_intent;
    const charge =
      payment && typeof payment !== "string"
        ? payment.latest_charge
        : null;

    let status = "pending";

    if (charge && typeof charge !== "string" && charge.disputed) {
      status = "disputed";
    } else if (
      charge &&
      typeof charge !== "string" &&
      charge.refunded
    ) {
      status = "refunded";
    } else if (
      session.payment_status === "paid" &&
      payment &&
      typeof payment !== "string" &&
      payment.status === "succeeded"
    ) {
      status = "paid";
    } else if (
      session.status === "expired" ||
      (payment &&
        typeof payment !== "string" &&
        payment.status === "canceled")
    ) {
      status = "not_completed";
    }

    res.json({
      status,
      mode: PAYMENT_MODE,
      amountInCents: session.amount_total,
      refundedInCents:
        charge && typeof charge !== "string"
          ? charge.amount_refunded
          : 0
    });
  } catch (error) {
    console.error(
      "Payment status lookup failed:",
      error.type || "Unknown error"
    );

    res.status(503).json({
      error: "Unable to verify this payment right now."
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});