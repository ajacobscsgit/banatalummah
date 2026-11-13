"use strict";

require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const { rateLimit } = require("express-rate-limit");
const { Pool } = require("pg");
const { Resend } = require("resend");
const Stripe = require("stripe");
const EVENTS = require("../js/events-data.js");
const {
  escapeHTML,
  isRegistrationOpen,
  isValidEmail,
  isValidSessionDate
} = require("./events-utils.js");
const {
  hashNewsletterToken,
  isValidNewsletterToken,
  parseNewsletterSubscription
} = require("./newsletter-utils.js");

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
const DATABASE_URL = process.env.DATABASE_URL || "";
const RESEND_API_KEY = process.env.RESEND_API_KEY || "";
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "";
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;
const EVENT_ADMIN_TOKEN = process.env.EVENT_ADMIN_TOKEN || "";
const EVENT_REGISTRATION_SETTING =
  process.env.EVENT_REGISTRATION_ENABLED || "false";
if (!["true", "false"].includes(EVENT_REGISTRATION_SETTING)) {
  console.error("EVENT_REGISTRATION_ENABLED must be true or false.");
  process.exit(1);
}
const EVENT_REGISTRATION_ENABLED = EVENT_REGISTRATION_SETTING === "true";
const EVENT_INTEREST_LIMIT = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});
const EVENT_REGISTRATION_LIMIT = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});
const NEWSLETTER_SUBSCRIPTION_LIMIT = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many email signup requests. Please try again later." }
});
const ADMIN_REQUEST_LIMIT = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." }
});
const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000
    })
  : null;
let databaseReady = false;
if (pool) {
  pool.on("error", error => {
    console.error("PostgreSQL connection error:", error.code || "database error");
    databaseReady = false;
  });
}

let progressCache = null;
let progressExpiresAt = 0;
let progressRequest = null;
let progressGeneration = 0;

function findEvent(eventId) {
  return EVENTS.find(event => event.id === eventId);
}

function requireDatabase(req, res, next) {
  if (!pool || !databaseReady) {
    return res.status(503).json({
      error: "Event services are not configured yet."
    });
  }

  next();
}

function requireEventEmail(req, res, next) {
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return res.status(503).json({
      error: "Event email service is not configured yet."
    });
  }

  next();
}

function requireNewsletterService(req, res, next) {
  if (!pool || !databaseReady) {
    return res.status(503).json({
      error: "Newsletter signup is unavailable because subscriber storage is not configured."
    });
  }
  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return res.status(503).json({
      error: "Newsletter confirmation email is not configured."
    });
  }
  next();
}

async function sendResendEmail({ to, subject, html, text }) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject,
      html,
      text
    }),
    signal: AbortSignal.timeout(10000)
  });

  if (!response.ok) {
    console.error("Resend email delivery failed:", response.status);
    const error = new Error("Email delivery failed.");
    error.code = `resend_${response.status}`;
    throw error;
  }
}

async function sendNewsletterEmail({ to, subject, html, text }) {
  if (!resend || !RESEND_FROM_EMAIL) {
    const error = new Error("Resend is not configured.");
    error.code = "resend_not_configured";
    throw error;
  }

  const { data, error } = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to: [to],
    subject,
    html,
    text
  }, {
    signal: AbortSignal.timeout(10000)
  });
  if (error) {
    console.error("Resend email delivery failed:", error.statusCode || "provider error");
    const deliveryError = new Error("Email delivery failed.");
    deliveryError.code = Number.isInteger(error.statusCode)
      ? `resend_${error.statusCode}`
      : "resend_api_error";
    throw deliveryError;
  }
  return { providerMessageId: data?.id || null };
}

async function sendEventInterestEmail(email, event, token) {
  const confirmationURL = new URL("events-confirm.html", frontend);
  const unsubscribeURL = new URL("events-unsubscribe.html", frontend);
  const tokenFragment = new URLSearchParams({ token }).toString();
  confirmationURL.hash = tokenFragment;
  unsubscribeURL.hash = tokenFragment;
  const title = escapeHTML(event.title);
  const confirmLink = escapeHTML(confirmationURL.href);
  const unsubscribeLink = escapeHTML(unsubscribeURL.href);

  await sendResendEmail({
    to: email,
    subject: "Confirm your Banāt al-Ummah event updates",
    text:
      `You asked to receive updates about ${event.title}. ` +
      `Confirm your email: ${confirmationURL.href}. ` +
      `To withdraw your request, visit: ${unsubscribeURL.href}`,
    html:
      `<p>You asked to receive updates about <strong>${title}</strong>.</p>` +
      `<p><a href="${confirmLink}">Confirm your email address</a></p>` +
      `<p><a href="${unsubscribeLink}">Withdraw this update request</a></p>`
  });
}

async function sendNewsletterConfirmationEmail(email, firstName, token) {
  const confirmationURL = new URL("newsletter-confirm.html", frontend);
  const unsubscribeURL = new URL("newsletter-unsubscribe.html", frontend);
  const tokenFragment = new URLSearchParams({ token }).toString();
  confirmationURL.hash = tokenFragment;
  unsubscribeURL.hash = tokenFragment;
  const greetingName = firstName
    ? ` ${escapeHTML(firstName)}`
    : "";
  const confirmLink = escapeHTML(confirmationURL.href);
  const unsubscribeLink = escapeHTML(unsubscribeURL.href);

  return sendNewsletterEmail({
    to: email,
    subject: "Confirm your Banāt al-Ummah email preferences",
    text:
      `Assalamu alaykum${firstName ? ` ${firstName}` : ""}. ` +
      "Please confirm your email preferences to receive the updates you selected. " +
      `Confirm: ${confirmationURL.href}. ` +
      `Unsubscribe: ${unsubscribeURL.href}.`,
    html:
      `<div style="background:#fbf8f1;color:#293d32;font-family:Arial,sans-serif;padding:32px">` +
      `<div style="margin:0 auto;max-width:560px">` +
      `<p style="color:#967b4b;font-size:12px;letter-spacing:2px;text-transform:uppercase">Banāt al-Ummah</p>` +
      `<h1 style="font-family:Georgia,serif;font-size:26px;font-weight:normal">As-salāmu alaykum${greetingName},</h1>` +
      `<p>Please confirm your email preferences to receive the updates you selected. We will not send these updates until you confirm.</p>` +
      `<p style="margin:28px 0"><a href="${confirmLink}" style="background:#315846;border-radius:4px;color:#fff;display:inline-block;padding:13px 20px;text-decoration:none">Confirm my email</a></p>` +
      `<p style="font-size:13px">If you did not request these updates, you can ignore this message. ` +
      `<a href="${unsubscribeLink}" style="color:#315846">Withdraw this request</a>.</p>` +
      `<p style="border-top:1px solid #e7dfd1;color:#6b756d;font-size:12px;margin-top:28px;padding-top:16px">Seeking beneficial knowledge. Growing in community.</p>` +
      `</div></div>`
  });
}

async function sendNewsletterWelcomeEmail(email, unsubscribeToken) {
  const unsubscribeURL = new URL("newsletter-unsubscribe.html", frontend);
  const logoURL = new URL("assets/icons/logo.png", frontend);
  unsubscribeURL.hash = new URLSearchParams({
    token: unsubscribeToken
  }).toString();
  const unsubscribeLink = escapeHTML(unsubscribeURL.href);
  const logoLink = escapeHTML(logoURL.href);
  const text = [
    "As-salāmu ʿalaykunna wa raḥmatullāhi wa barakātuh!",
    "",
    "Welcome to Banat Al-Ummah!",
    "",
    "We're delighted to have you join our growing community.",
    "",
    "You'll receive updates about the classes, gatherings, educational opportunities, and initiatives you selected.",
    "",
    "We look forward to learning, growing, and connecting with you, in shā' Allāh.",
    "",
    "With appreciation,",
    "The Banat Al-Ummah Team",
    "",
    `Unsubscribe: ${unsubscribeURL.href}`
  ].join("\n");
  const html =
    `<div style="background:#fbf8f1;color:#293d32;font-family:Arial,sans-serif;padding:32px">` +
    `<div style="margin:0 auto;max-width:560px">` +
    `<p style="text-align:center"><img src="${logoLink}" alt="Banat Al-Ummah" width="112" style="height:auto;max-width:112px"></p>` +
    `<h1 style="color:#315846;font-family:Georgia,serif;font-size:26px;font-weight:normal">As-salāmu ʿalaykunna wa raḥmatullāhi wa barakātuh!</h1>` +
    `<p>Welcome to Banat Al-Ummah!</p>` +
    `<p>We're delighted to have you join our growing community.</p>` +
    `<p>You'll receive updates about the classes, gatherings, educational opportunities, and initiatives you selected.</p>` +
    `<p>We look forward to learning, growing, and connecting with you, in shā' Allāh.</p>` +
    `<p>With appreciation,<br>The Banat Al-Ummah Team</p>` +
    `<p style="border-top:1px solid #e7dfd1;color:#6b756d;font-size:12px;margin-top:28px;padding-top:16px">` +
    `<a href="${unsubscribeLink}" style="color:#315846">Unsubscribe</a></p>` +
    `</div></div>`;

  return sendNewsletterEmail({
    to: email,
    subject: "Welcome to the Banat Al-Ummah Community 🌸",
    html,
    text
  });
}

async function recordNewsletterDelivery(
  subscriberId,
  templateKey,
  status,
  providerMessageId = null,
  errorCode = null
) {
  try {
    await pool.query(
      `INSERT INTO newsletter_delivery_attempts
         (subscriber_id, template_key, status, provider_message_id, error_code)
       VALUES ($1, $2, $3, $4, $5)`,
      [subscriberId, templateKey, status, providerMessageId, errorCode]
    );
  } catch (error) {
    console.error(
      "Newsletter delivery attempt could not be recorded:",
      error.code || "database error"
    );
  }
}

async function sendRegistrationConfirmation(registration, event) {
  const date = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${registration.session_date}T12:00:00Z`));
  const eventTitle = escapeHTML(event.title);
  const name = escapeHTML(registration.full_name);
  const location = escapeHTML(event.location);
  const amount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(registration.total_amount_cents / 100);

  await sendResendEmail({
    to: registration.email,
    subject: `Registration confirmed: ${event.title}`,
    text:
      `Assalamu alaykum ${registration.full_name}, your payment of ${amount} ` +
      `for ${event.title} on ${date} is confirmed. ` +
      `The event location is ${event.location}.`,
    html:
      `<p>Assalamu alaykum ${name},</p>` +
      `<p>Your payment of <strong>${amount}</strong> for ` +
      `<strong>${eventTitle}</strong> is confirmed.</p>` +
      `<p>Session: ${escapeHTML(date)}<br>` +
      `Location: ${location}</p>` +
      `<p>Jazakum Allahu khayran for registering.</p>`
  });
}

async function initializeDatabase() {
  if (!pool) return;

  for (const migrationName of [
    "001_event_registration.sql",
    "002_newsletter_subscribers.sql",
    "003_newsletter_welcome_delivery.sql"
  ]) {
    const migration = fs.readFileSync(
      path.join(__dirname, "migrations", migrationName),
      "utf8"
    );
    await pool.query(migration);
  }
  databaseReady = true;
}

function requireAdmin(req, res, next) {
  if (EVENT_ADMIN_TOKEN.length < 32) {
    return res.status(503).json({
      error: "Event administration is not configured."
    });
  }

  const authorization = req.get("authorization") || "";
  const supplied = authorization.startsWith("Bearer ")
    ? authorization.slice(7)
    : "";
  const expectedBuffer = Buffer.from(EVENT_ADMIN_TOKEN);
  const suppliedBuffer = Buffer.from(supplied);

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  next();
}

async function handleEventCheckoutWebhook(event) {
  const session = event.data.object;
  const registrationId = session.metadata?.event_registration_id;
  const eventId = session.metadata?.event_id;

  if (!/^\d+$/.test(registrationId || "") || !eventId || !pool) {
    throw new Error("Invalid event registration reference.");
  }

  const registrationResult = await pool.query(
    `SELECT id, event_id, session_date, full_name, email,
            total_amount_cents, status, stripe_checkout_session_id,
            confirmation_email_sent_at
       FROM event_registrations
      WHERE id = $1`,
    [registrationId]
  );
  const registration = registrationResult.rows[0];

  if (
    !registration ||
    registration.event_id !== eventId ||
    registration.stripe_checkout_session_id !== session.id
  ) {
    throw new Error("Event registration reference did not match.");
  }

  if (
    event.type === "checkout.session.completed" &&
    session.payment_status !== "paid"
  ) {
    return;
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    if (
      session.payment_status !== "paid" ||
      session.currency !== "usd" ||
      session.amount_total !== registration.total_amount_cents ||
      session.livemode !== (PAYMENT_MODE === "live")
    ) {
      throw new Error("Stripe event payment details did not match.");
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id || null;

    await pool.query(
      `UPDATE event_registrations
          SET status = 'paid',
              stripe_payment_intent_id = $3,
              paid_at = COALESCE(paid_at, now()),
              updated_at = now()
        WHERE id = $1
          AND stripe_checkout_session_id = $2
          AND status IN ('pending', 'paid')`,
      [registrationId, session.id, paymentIntentId]
    );

    const eventConfig = findEvent(eventId);
    if (!eventConfig) throw new Error("Event configuration was not found.");

    const currentResult = await pool.query(
      `SELECT id, session_date, full_name, email, total_amount_cents,
              confirmation_email_sent_at
         FROM event_registrations
        WHERE id = $1
          AND status = 'paid'`,
      [registrationId]
    );
    const paidRegistration = currentResult.rows[0];

    if (paidRegistration && !paidRegistration.confirmation_email_sent_at) {
      await sendRegistrationConfirmation(paidRegistration, eventConfig);
      await pool.query(
        `UPDATE event_registrations
            SET confirmation_email_sent_at = now(),
                updated_at = now()
          WHERE id = $1
            AND confirmation_email_sent_at IS NULL`,
        [registrationId]
      );
    }

    return;
  }

  if (event.type === "checkout.session.async_payment_failed") {
    await pool.query(
      `UPDATE event_registrations
          SET status = 'failed', updated_at = now()
        WHERE id = $1 AND stripe_checkout_session_id = $2
          AND status = 'pending'`,
      [registrationId, session.id]
    );
    return;
  }

  if (event.type === "checkout.session.expired") {
    await pool.query(
      `UPDATE event_registrations
          SET status = 'expired', updated_at = now()
        WHERE id = $1 AND stripe_checkout_session_id = $2
          AND status = 'pending'`,
      [registrationId, session.id]
    );
  }
}

async function handleEventPaymentWebhook(event) {
  if (!pool) return false;

  const payment = event.data.object;
  const paymentIntentId =
    typeof payment.payment_intent === "string"
      ? payment.payment_intent
      : payment.payment_intent?.id;
  if (!paymentIntentId) return false;

  if (event.type === "charge.refunded") {
    const result = await pool.query(
      `UPDATE event_registrations
          SET refunded_amount_cents = LEAST(total_amount_cents, $2),
              status = CASE
                WHEN $2 >= total_amount_cents THEN 'refunded'
                ELSE 'partially_refunded'
              END,
              updated_at = now()
        WHERE stripe_payment_intent_id = $1
        RETURNING id`,
      [paymentIntentId, payment.amount_refunded]
    );
    return result.rowCount > 0;
  }

  if (event.type === "charge.dispute.created") {
    const result = await pool.query(
      `UPDATE event_registrations
          SET status = 'disputed', updated_at = now()
        WHERE stripe_payment_intent_id = $1
        RETURNING id`,
      [paymentIntentId]
    );
    return result.rowCount > 0;
  }

  if (event.type === "charge.dispute.closed") {
    const status =
      payment.status === "won"
        ? "dispute_won"
        : payment.status === "lost"
          ? "dispute_lost"
          : null;
    if (!status) return false;

    const result = await pool.query(
      `UPDATE event_registrations
          SET status = $2, updated_at = now()
        WHERE stripe_payment_intent_id = $1
        RETURNING id`,
      [paymentIntentId, status]
    );
    return result.rowCount > 0;
  }

  return false;
}

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
app.set("trust proxy", 1);

// CORS only permits the live site and the explicitly configured frontend origin.
const allowedFrontendOrigins = new Set([
  frontend.origin,
  "https://banatalummah.com",
  "https://www.banatalummah.com",
  ...(process.env.FRONTEND_ALLOWED_ORIGINS || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean)
]);
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedFrontendOrigins.has(origin));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"]
  })
);
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    mode: PAYMENT_MODE,
    eventDatabaseAvailable: Boolean(pool && databaseReady),
    eventEmailAvailable: Boolean(RESEND_API_KEY && RESEND_FROM_EMAIL),
    newsletterAvailable: Boolean(
      pool && databaseReady && resend && RESEND_FROM_EMAIL
    )
  });
});

app.get("/api/config", (req, res) => {
  res.json({
    publishableKey: PUBLISHABLE_KEY,
    mode: PAYMENT_MODE
  });
});

app.post(
  ["/api/newsletter/subscribe", "/api/newsletter-subscriptions"],
  express.json({ limit: "10kb" }),
  NEWSLETTER_SUBSCRIPTION_LIMIT,
  requireNewsletterService,
  async (req, res) => {
    if (req.body?.website) {
      return res.status(400).json({
        error: "Your request could not be processed."
      });
    }

    const parsed = parseNewsletterSubscription(req.body);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const { email, firstName, preferences } = parsed.value;
    const confirmationToken = crypto.randomBytes(32).toString("hex");
    const unsubscribeToken = crypto.randomBytes(32).toString("hex");
    const confirmationTokenHash = hashNewsletterToken(confirmationToken);
    const unsubscribeTokenHash = hashNewsletterToken(unsubscribeToken);
    let client;
    let subscriberId;
    let sendConfirmation = false;
    let transactionStarted = false;

    try {
      client = await pool.connect();
      await client.query("BEGIN");
      transactionStarted = true;
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        ["newsletter-subscription", email]
      );
      const existing = await client.query(
        `SELECT id, status
           FROM newsletter_subscribers
          WHERE email = $1
          FOR UPDATE`,
        [email]
      );

      if (existing.rows[0]?.status === "confirmed") {
        await client.query(
          `UPDATE newsletter_subscribers
              SET first_name = $2,
                  wants_upcoming_events = $3,
                  wants_arabic_classes = $4,
                  wants_general_updates = $5,
                  consented_at = now(),
                  updated_at = now()
            WHERE email = $1`,
          [
            email,
            firstName,
            preferences.upcomingEvents,
            preferences.arabicClasses,
            preferences.generalUpdates
          ]
        );
        await client.query("COMMIT");
        transactionStarted = false;
        return res.json({
          message:
            "Your request has been received. If confirmation is needed, please check your inbox."
        });
      }

      if (existing.rowCount > 0) {
        const updated = await client.query(
          `UPDATE newsletter_subscribers
              SET first_name = $2,
                  wants_upcoming_events = $3,
                  wants_arabic_classes = $4,
                  wants_general_updates = $5,
                  consented_at = now(),
                  status = 'pending',
                  confirmation_token_hash = $6,
                  confirmation_expires_at = now() + interval '24 hours',
                  unsubscribe_token_hash = $7,
                  confirmed_at = NULL,
                  unsubscribed_at = NULL,
                  updated_at = now()
            WHERE email = $1
            RETURNING id`,
          [
            email,
            firstName,
            preferences.upcomingEvents,
            preferences.arabicClasses,
            preferences.generalUpdates,
            confirmationTokenHash,
            unsubscribeTokenHash
          ]
        );
        subscriberId = updated.rows[0].id;
      } else {
        const inserted = await client.query(
          `INSERT INTO newsletter_subscribers
             (email, first_name, wants_upcoming_events, wants_arabic_classes,
              wants_general_updates, status, confirmation_token_hash,
              confirmation_expires_at, unsubscribe_token_hash)
           VALUES ($1, $2, $3, $4, $5, 'pending', $6,
                   now() + interval '24 hours', $7)
           RETURNING id`,
          [
            email,
            firstName,
            preferences.upcomingEvents,
            preferences.arabicClasses,
            preferences.generalUpdates,
            confirmationTokenHash,
            unsubscribeTokenHash
          ]
        );
        subscriberId = inserted.rows[0].id;
      }

      await client.query(
        `UPDATE newsletter_unsubscribe_tokens
            SET used_at = now()
          WHERE subscriber_id = $1 AND used_at IS NULL`,
        [subscriberId]
      );
      await client.query(
        `INSERT INTO newsletter_unsubscribe_tokens (token_hash, subscriber_id)
         VALUES ($1, $2)`,
        [unsubscribeTokenHash, subscriberId]
      );
      await client.query("COMMIT");
      transactionStarted = false;
      sendConfirmation = true;
    } catch (error) {
      if (transactionStarted) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Newsletter subscription rollback failed:",
            rollbackError.code || "database error"
          );
        }
      }
      console.error(
        "Newsletter subscription could not be saved:",
        error.code || "database error"
      );
      return res.status(503).json({
        error: "Your request could not be saved. Please try again later."
      });
    } finally {
      if (client) client.release();
    }

    if (sendConfirmation) {
      try {
        const delivery = await sendNewsletterConfirmationEmail(
          email,
          firstName,
          confirmationToken
        );
        await recordNewsletterDelivery(
          subscriberId,
          "confirmation",
          "sent",
          delivery.providerMessageId
        );
      } catch (error) {
        await recordNewsletterDelivery(
          subscriberId,
          "confirmation",
          "failed",
          null,
          typeof error.code === "string" ? error.code : "provider_unavailable"
        );
        return res.status(502).json({
          error:
            "Your request is pending, but the confirmation email could not be sent. Please try again later."
        });
      }
    }

    return res.status(202).json({
      message:
        "Your request has been received. If confirmation is needed, please check your inbox."
    });
  }
);

app.post(
  "/api/newsletter-subscriptions/confirm",
  express.json({ limit: "10kb" }),
  NEWSLETTER_SUBSCRIPTION_LIMIT,
  requireDatabase,
  async (req, res) => {
    const { token } = req.body || {};
    if (!isValidNewsletterToken(token)) {
      return res.status(400).json({
        error: "This confirmation link is invalid."
      });
    }

    const unsubscribeToken = crypto.randomBytes(32).toString("hex");
    let client;
    let transactionStarted = false;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      transactionStarted = true;
      const result = await client.query(
        `UPDATE newsletter_subscribers
            SET status = 'confirmed',
                confirmation_token_hash = NULL,
                confirmation_expires_at = NULL,
                unsubscribe_token_hash = $2,
                confirmed_at = now(),
                updated_at = now()
          WHERE confirmation_token_hash = $1
            AND status = 'pending'
            AND confirmation_expires_at > now()
          RETURNING id, email, first_name`,
        [hashNewsletterToken(token), hashNewsletterToken(unsubscribeToken)]
      );
      const subscriber = result.rows[0];
      if (!subscriber) {
        await client.query("ROLLBACK");
        transactionStarted = false;
        return res.status(404).json({
          error: "This confirmation link has expired or was already used."
        });
      }

      await client.query(
        `INSERT INTO newsletter_unsubscribe_tokens (token_hash, subscriber_id)
         VALUES ($1, $2)`,
        [hashNewsletterToken(unsubscribeToken), subscriber.id]
      );
      await client.query("COMMIT");
      transactionStarted = false;

      let welcomeSent = false;
      try {
        const delivery = await sendNewsletterWelcomeEmail(
          subscriber.email,
          unsubscribeToken
        );
        await recordNewsletterDelivery(
          subscriber.id,
          "welcome",
          "sent",
          delivery.providerMessageId
        );
        welcomeSent = true;
      } catch (error) {
        await recordNewsletterDelivery(
          subscriber.id,
          "welcome",
          "failed",
          null,
          typeof error.code === "string" ? error.code : "provider_unavailable"
        );
        console.error(
          "Newsletter welcome email failed:",
          error.code || "provider error"
        );
      }

      return res.json({
        message: welcomeSent
          ? "Your email is confirmed. Welcome to the Banat Al-Ummah community!"
          : "Your email is confirmed, but the welcome email could not be sent. Your subscription is active."
      });
    } catch (error) {
      if (transactionStarted && client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Newsletter confirmation rollback failed:",
            rollbackError.code || "database error"
          );
        }
      }
      console.error(
        "Newsletter confirmation failed:",
        error.code || "database error"
      );
      return res.status(503).json({
        error: "Your email could not be confirmed. Please try again."
      });
    } finally {
      if (client) client.release();
    }
  }
);

app.post(
  "/api/newsletter-subscriptions/unsubscribe",
  express.json({ limit: "10kb" }),
  NEWSLETTER_SUBSCRIPTION_LIMIT,
  requireDatabase,
  async (req, res) => {
    const { token } = req.body || {};
    if (!isValidNewsletterToken(token)) {
      return res.status(400).json({
        error: "This unsubscribe link is invalid."
      });
    }

    let client;
    let transactionStarted = false;
    try {
      client = await pool.connect();
      await client.query("BEGIN");
      transactionStarted = true;
      const result = await client.query(
        `WITH matching AS (
           SELECT subscriber_id
             FROM newsletter_unsubscribe_tokens
            WHERE token_hash = $1 AND used_at IS NULL
           UNION
           SELECT id
             FROM newsletter_subscribers
            WHERE unsubscribe_token_hash = $1
         )
         UPDATE newsletter_subscribers
            SET status = 'unsubscribed',
                confirmation_token_hash = NULL,
                confirmation_expires_at = NULL,
                confirmed_at = NULL,
                unsubscribed_at = now(),
                updated_at = now()
          WHERE id IN (SELECT subscriber_id FROM matching)
            AND status <> 'unsubscribed'
          RETURNING id`,
        [hashNewsletterToken(token)]
      );
      if (result.rows[0]) {
        await client.query(
          `UPDATE newsletter_unsubscribe_tokens
              SET used_at = now()
            WHERE subscriber_id = $1 AND used_at IS NULL`,
          [result.rows[0].id]
        );
      }
      await client.query("COMMIT");
      transactionStarted = false;
      return res.json({
        message:
          "If this link matched a subscriber, their email preferences have been updated."
      });
    } catch (error) {
      if (transactionStarted && client) {
        try {
          await client.query("ROLLBACK");
        } catch (rollbackError) {
          console.error(
            "Newsletter unsubscribe rollback failed:",
            rollbackError.code || "database error"
          );
        }
      }
      console.error(
        "Newsletter unsubscribe failed:",
        error.code || "database error"
      );
      return res.status(503).json({
        error: "Your email preferences could not be updated. Please try again."
      });
    } finally {
      if (client) client.release();
    }
  }
);

app.post(
  "/api/event-interests",
  express.json({ limit: "10kb" }),
  EVENT_INTEREST_LIMIT,
  requireDatabase,
  requireEventEmail,
  async (req, res) => {
    const { eventId, email: submittedEmail, consent, website } = req.body || {};
    const event = findEvent(eventId);
    const email = typeof submittedEmail === "string"
      ? submittedEmail.trim().toLowerCase()
      : "";

    if (website) {
      return res.status(400).json({
        error: "Your request could not be processed."
      });
    }

    if (!event || !isValidEmail(email) || consent !== true) {
      return res.status(400).json({
        error: "Choose an event, enter a valid email address, and agree to event updates."
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const client = await pool.connect();
    let shouldSendEmail = false;

    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        [event.id, email]
      );
      const existing = await client.query(
        `SELECT subscribed, confirmed
           FROM event_interests
          WHERE event_id = $1 AND email = $2
          FOR UPDATE`,
        [event.id, email]
      );

      if (existing.rows[0]?.subscribed && existing.rows[0]?.confirmed) {
        await client.query("COMMIT");
        return res.status(202).json({
          message: "If you need to confirm your request, please check your email."
        });
      }

      if (existing.rowCount > 0) {
        await client.query(
          `UPDATE event_interests
              SET subscribed = true,
                  confirmed = false,
                  consented_at = now(),
                  unsubscribe_token_hash = $3,
                  confirmation_expires_at = now() + interval '7 days',
                  updated_at = now()
            WHERE event_id = $1 AND email = $2`,
          [event.id, email, tokenHash]
        );
      } else {
        await client.query(
          `INSERT INTO event_interests
             (event_id, email, unsubscribe_token_hash)
           VALUES ($1, $2, $3)`,
          [event.id, email, tokenHash]
        );
      }

      await client.query("COMMIT");
      shouldSendEmail = true;
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Event interest could not be saved:", error.code || "database error");
      return res.status(503).json({
        error: "Your request could not be saved. Please try again later."
      });
    } finally {
      client.release();
    }

    if (shouldSendEmail) {
      try {
        await sendEventInterestEmail(email, event, token);
      } catch {
        return res.status(502).json({
          error:
            "Your request was saved, but we could not send the confirmation email. Please try again later."
        });
      }
    }

    return res.status(202).json({
      message: "If you need to confirm your request, please check your email."
    });
  }
);

app.post(
  "/api/event-interests/unsubscribe",
  express.json({ limit: "10kb" }),
  EVENT_INTEREST_LIMIT,
  requireDatabase,
  (req, res) => {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        error: "This unsubscribe link is invalid."
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    pool.query(
      `UPDATE event_interests
          SET subscribed = false, confirmed = false, updated_at = now()
        WHERE unsubscribe_token_hash = $1 AND subscribed = true`,
      [tokenHash]
    ).then(() => {
      res.json({
        message: "Event updates have been turned off for this link."
      });
    }).catch(error => {
      console.error("Event unsubscribe failed:", error.code || "database error");
      res.status(503).json({
        error: "Your email preferences could not be updated. Please try again."
      });
    });
  }
);

app.post(
  "/api/event-interests/confirm",
  express.json({ limit: "10kb" }),
  EVENT_INTEREST_LIMIT,
  requireDatabase,
  (req, res) => {
    const token = req.body?.token;
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/i.test(token)) {
      return res.status(400).json({
        error: "This confirmation link is invalid."
      });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    pool.query(
      `UPDATE event_interests
          SET confirmed = true, updated_at = now()
        WHERE unsubscribe_token_hash = $1 AND subscribed = true
          AND confirmation_expires_at > now()`,
      [tokenHash]
    ).then(result => {
      if (result.rowCount === 0) {
        return res.status(404).json({
          error: "This confirmation link has expired or was already withdrawn."
        });
      }

      return res.json({
        message: "Your email is confirmed. You will receive updates about this event."
      });
    }).catch(error => {
      console.error("Event email confirmation failed:", error.code || "database error");
      res.status(503).json({
        error: "Your email could not be confirmed. Please try again."
      });
    });
  }
);

app.post(
  "/api/event-registrations",
  express.json({ limit: "10kb" }),
  EVENT_REGISTRATION_LIMIT,
  requireDatabase,
  requireEventEmail,
  async (req, res) => {
    const {
      eventId,
      fullName: submittedName,
      email: submittedEmail,
      sessionDate,
      consent
    } = req.body || {};
    const idempotencyKey = req.get("Idempotency-Key") || "";
    const event = findEvent(eventId);
    const fullName = typeof submittedName === "string"
      ? submittedName.trim().replace(/\s+/g, " ")
      : "";
    const email = typeof submittedEmail === "string"
      ? submittedEmail.trim().toLowerCase()
      : "";

    if (!event || !isRegistrationOpen(event, EVENT_REGISTRATION_ENABLED)) {
      return res.status(409).json({
        error: "Registration for this event is not open yet."
      });
    }

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        idempotencyKey
      ) ||
      fullName.length < 1 ||
      fullName.length > 120 ||
      !isValidEmail(email) ||
      !isValidSessionDate(event, sessionDate) ||
      consent !== true
    ) {
      return res.status(400).json({
        error: "Check your name, email, selected session, and event-policy acknowledgement."
      });
    }

    const totalAmountInCents = event.priceInCents;
    if (!Number.isSafeInteger(totalAmountInCents) || totalAmountInCents < 100) {
      return res.status(503).json({
        error: "Event pricing is not configured."
      });
    }

    let registration;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
        ["event-registration", idempotencyKey]
      );

      const existing = await client.query(
        `SELECT id, registration_ref, event_id, session_date, full_name,
                email, total_amount_cents, status, stripe_checkout_session_id,
                expires_at
           FROM event_registrations
          WHERE idempotency_key = $1`,
        [idempotencyKey]
      );
      if (existing.rowCount > 0) {
        const previous = existing.rows[0];
        if (
          previous.event_id !== event.id ||
          previous.session_date !== sessionDate ||
          previous.full_name !== fullName ||
          previous.email !== email ||
          previous.total_amount_cents !== totalAmountInCents
        ) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "This checkout request does not match the previous request."
          });
        }

        if (
          previous.status !== "pending" ||
          new Date(previous.expires_at).getTime() <= Date.now()
        ) {
          await client.query(
            `UPDATE event_registrations
                SET status = 'expired', updated_at = now()
              WHERE id = $1 AND status = 'pending'`,
            [previous.id]
          );
          await client.query("COMMIT");
          return res.status(409).json({
            error: "This checkout expired. Start a new registration to continue."
          });
        }

        registration = previous;
        await client.query("COMMIT");
      } else {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
          [event.id, sessionDate]
        );

        await client.query(
          `UPDATE event_registrations
              SET status = 'expired', updated_at = now()
            WHERE event_id = $1 AND session_date = $2
              AND status = 'pending' AND expires_at <= now()`,
          [event.id, sessionDate]
        );

        const sessionCapacity = await client.query(
          `SELECT capacity
             FROM event_sessions
            WHERE event_id = $1 AND session_date = $2
            FOR UPDATE`,
          [event.id, sessionDate]
        );
        if (sessionCapacity.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "This class session is not available for registration."
          });
        }

        const occupied = await client.query(
          `SELECT COALESCE(SUM(1), 0)::integer AS seats
             FROM event_registrations
            WHERE event_id = $1 AND session_date = $2
              AND status NOT IN ('failed', 'expired')`,
          [event.id, sessionDate]
        );
        if (occupied.rows[0].seats >= sessionCapacity.rows[0].capacity) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "This class session is full. Please choose another date."
          });
        }

        const expiresAt = Math.floor(Date.now() / 1000) + 35 * 60;
        const inserted = await client.query(
          `INSERT INTO event_registrations
             (registration_ref, idempotency_key, event_id, session_date,
              full_name, email, total_amount_cents, stripe_live_mode, expires_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, to_timestamp($9))
           RETURNING id, registration_ref, event_id, session_date, full_name,
                     email, total_amount_cents, status,
                     stripe_checkout_session_id, expires_at`,
          [
            crypto.randomUUID(),
            idempotencyKey,
            event.id,
            sessionDate,
            fullName,
            email,
            totalAmountInCents,
            PAYMENT_MODE === "live",
            expiresAt
          ]
        );
        registration = inserted.rows[0];
        await client.query("COMMIT");
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Event registration could not be reserved:", error.code || "database error");
      return res.status(503).json({
        error: "Registration could not be started. Please try again later."
      });
    } finally {
      client.release();
    }

    const successURL = new URL("registration-success.html", frontend);
    const stripeSuccessURL =
      `${successURL.href}?session_id={CHECKOUT_SESSION_ID}`;
    const cancelURL = new URL("register.html", frontend);
    cancelURL.searchParams.set("event", event.id);
    let session;

    try {
      if (registration.stripe_checkout_session_id) {
        session = await stripe.checkout.sessions.retrieve(
          registration.stripe_checkout_session_id
        );
        if (session.status === "expired") {
          await pool.query(
            `UPDATE event_registrations
                SET status = 'expired', updated_at = now()
              WHERE id = $1 AND status = 'pending'`,
            [registration.id]
          );
          return res.status(409).json({
            error: "This checkout expired. Start a new registration to continue."
          });
        }
        if (session.status === "complete") {
          successURL.searchParams.set("session_id", session.id);
          return res.json({ checkoutUrl: successURL.href });
        }
        if (session.url) {
          return res.json({ checkoutUrl: session.url });
        }
      } else {
        const expiresAt = Math.floor(
          new Date(registration.expires_at).getTime() / 1000
        );
        session = await stripe.checkout.sessions.create(
          {
            mode: "payment",
            customer_email: registration.email,
            client_reference_id: registration.registration_ref,
            metadata: {
              event_registration_id: String(registration.id),
              event_id: event.id
            },
            payment_intent_data: {
              metadata: {
                event_registration_id: String(registration.id),
                event_id: event.id
              }
            },
            line_items: [
              {
                price_data: {
                  currency: "usd",
                  product_data: {
                    name: `${event.title} — ${registration.session_date}`,
                    description: "One class session"
                  },
                  unit_amount: totalAmountInCents
                },
                quantity: 1
              }
            ],
            expires_at: expiresAt,
            success_url: stripeSuccessURL,
            cancel_url: cancelURL.href
          },
          { idempotencyKey }
        );

        if (!session.url) {
          throw new Error("Stripe did not return a checkout URL.");
        }

        await pool.query(
          `UPDATE event_registrations
              SET stripe_checkout_session_id = $2, updated_at = now()
            WHERE id = $1 AND status = 'pending'`,
          [registration.id, session.id]
        );
      }

      if (!session.url) {
        throw new Error("Stripe did not return a checkout URL.");
      }
      return res.status(201).json({ checkoutUrl: session.url });
    } catch (error) {
      console.error("Event checkout creation failed:", error.type || "Stripe error");
      return res.status(503).json({
        error: "Secure checkout could not be opened. Please try again later."
      });
    }
  }
);

app.get(
"/api/event-registration-status",
EVENT_REGISTRATION_LIMIT,
requireDatabase,
async (req, res) => {
  const sessionId = req.query.session_id;
  if (
    typeof sessionId !== "string" ||
    !/^cs_(test|live)_[A-Za-z0-9]+$/.test(sessionId)
  ) {
    return res.status(400).json({ error: "Invalid payment reference." });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const eventId = session.metadata?.event_id;

    if (
      !eventId ||
      !findEvent(eventId) ||
      session.livemode !== (PAYMENT_MODE === "live")
    ) {
      return res.status(404).json({ error: "Registration not found." });
    }

    const result = await pool.query(
      `SELECT status, total_amount_cents, refunded_amount_cents
         FROM event_registrations
        WHERE stripe_checkout_session_id = $1
          AND event_id = $2`,
      [sessionId, eventId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Registration not found." });
    }

    return res.json({
      status: result.rows[0].status,
      amountInCents: result.rows[0].total_amount_cents,
      refundedInCents: result.rows[0].refunded_amount_cents
    });
  } catch (error) {
    console.error("Event registration status lookup failed:", error.type || "service error");
    return res.status(503).json({
      error: "Unable to verify this registration right now."
    });
  }
});

app.get(
  "/api/admin/event-interests",
  ADMIN_REQUEST_LIMIT,
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    const eventId = req.query.event_id;
    const limit = Number(req.query.limit || 100);
    if (
      (eventId && !findEvent(eventId)) ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 500
    ) {
      return res.status(400).json({ error: "Invalid interest-list filters." });
    }

    try {
      const result = await pool.query(
        `SELECT event_id, email, consented_at, created_at
           FROM event_interests
          WHERE subscribed = true AND confirmed = true
            AND ($1::text IS NULL OR event_id = $1)
          ORDER BY created_at DESC
          LIMIT $2`,
        [eventId || null, limit]
      );
      return res.json({ interests: result.rows });
    } catch (error) {
      console.error("Event interest lookup failed:", error.code || "database error");
      return res.status(503).json({
        error: "Event interest records are temporarily unavailable."
      });
    }
  }
);

app.get(
  "/api/admin/newsletter-summary",
  ADMIN_REQUEST_LIMIT,
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT
           count(*) FILTER (WHERE status = 'confirmed')::integer AS confirmed,
           count(*) FILTER (WHERE status = 'pending')::integer AS pending,
           count(*) FILTER (WHERE status = 'unsubscribed')::integer AS unsubscribed,
           count(*) FILTER (
             WHERE status = 'confirmed' AND wants_upcoming_events
           )::integer AS upcoming_events,
           count(*) FILTER (
             WHERE status = 'confirmed' AND wants_arabic_classes
           )::integer AS arabic_classes,
           count(*) FILTER (
             WHERE status = 'confirmed' AND wants_general_updates
           )::integer AS general_updates,
           (
             SELECT count(*)::integer
               FROM newsletter_delivery_attempts
              WHERE status = 'failed'
           ) AS delivery_failures
         FROM newsletter_subscribers`
      );
      return res.json({ summary: result.rows[0] });
    } catch (error) {
      console.error(
        "Newsletter summary lookup failed:",
        error.code || "database error"
      );
      return res.status(503).json({
        error: "Newsletter summary is temporarily unavailable."
      });
    }
  }
);

app.get(
  "/api/admin/event-registrations",
  ADMIN_REQUEST_LIMIT,
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    const eventId = req.query.event_id;
    const status = req.query.status;
    const limit = Number(req.query.limit || 100);
    const validStatuses = new Set([
      "pending",
      "paid",
      "failed",
      "expired",
      "partially_refunded",
      "refunded",
      "disputed",
      "dispute_won",
      "dispute_lost"
    ]);

    if (
      (eventId && !findEvent(eventId)) ||
      (status && !validStatuses.has(status)) ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 500
    ) {
      return res.status(400).json({ error: "Invalid registration filters." });
    }

    try {
      const result = await pool.query(
        `SELECT registration_ref, event_id, session_date, full_name, email,
                total_amount_cents, status, created_at, paid_at
           FROM event_registrations
          WHERE ($1::text IS NULL OR event_id = $1)
            AND ($2::text IS NULL OR status = $2)
          ORDER BY created_at DESC
          LIMIT $3`,
        [eventId || null, status || null, limit]
      );
      return res.json({ registrations: result.rows });
    } catch (error) {
      console.error("Event registration lookup failed:", error.code || "database error");
      return res.status(503).json({
        error: "Registration records are temporarily unavailable."
      });
    }
  }
);

app.post(
  "/api/admin/event-sessions",
  express.json({ limit: "10kb" }),
  ADMIN_REQUEST_LIMIT,
  requireDatabase,
  requireAdmin,
  async (req, res) => {
    const { eventId, sessions } = req.body || {};
    const event = findEvent(eventId);
    if (
      !event ||
      !Number.isSafeInteger(event.capacityPerSession) ||
      event.capacityPerSession < 1 ||
      !Array.isArray(sessions) ||
      sessions.length < 1 ||
      sessions.length > 50 ||
      sessions.some(session => !isValidSessionDate(event, session?.sessionDate))
    ) {
      return res.status(400).json({
        error: "Event capacity or session dates are not configured correctly."
      });
    }
    const sessionDates = sessions.map(session => session.sessionDate);
    if (new Set(sessionDates).size !== sessionDates.length) {
      return res.status(400).json({
        error: "A class session date may only be configured once."
      });
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      for (const sessionDate of sessionDates.sort()) {
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
          [event.id, sessionDate]
        );
        await client.query(
          `UPDATE event_registrations
              SET status = 'expired', updated_at = now()
            WHERE event_id = $1 AND session_date = $2
              AND status = 'pending' AND expires_at <= now()`,
          [event.id, sessionDate]
        );
        const occupied = await client.query(
          `SELECT COALESCE(SUM(1), 0)::integer AS seats
             FROM event_registrations
            WHERE event_id = $1 AND session_date = $2
              AND (status = 'paid' OR
                   (status = 'pending' AND expires_at > now()))`,
          [event.id, sessionDate]
        );
        if (occupied.rows[0].seats > event.capacityPerSession) {
          throw new Error("New capacity is below the number of booked seats.");
        }
        await client.query(
          `INSERT INTO event_sessions (event_id, session_date, capacity)
           VALUES ($1, $2, $3)
           ON CONFLICT (event_id, session_date)
           DO UPDATE SET capacity = EXCLUDED.capacity`,
          [event.id, sessionDate, event.capacityPerSession]
        );
      }
      await client.query("COMMIT");
      return res.json({ configured: sessions.length });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("Event capacity update failed:", error.code || "capacity conflict");
      return res.status(409).json({
        error: "Session capacity could not be updated."
      });
    } finally {
      client.release();
    }
  }
);

app.post(
  "/api/stripe-webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  async (req, res) => {
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

    const session = event.data.object;
    const isEventRegistration =
      typeof session?.metadata?.event_registration_id === "string" &&
      session.metadata.event_registration_id.length > 0;

    if (
      isEventRegistration &&
      [
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
        "checkout.session.async_payment_failed",
        "checkout.session.expired"
      ].includes(event.type)
    ) {
      try {
        await handleEventCheckoutWebhook(event);
      } catch (error) {
        console.error(
          "Event checkout webhook processing failed:",
          error.message
        );
        return res.sendStatus(503);
      }

      return res.json({ received: true });
    }

    if (
      event.type === "payment_intent.succeeded" &&
      event.data.object.metadata?.event_registration_id
    ) {
      return res.json({ received: true });
    }

    if (
      [
        "charge.refunded",
        "charge.dispute.created",
        "charge.dispute.closed"
      ].includes(event.type)
    ) {
      try {
        if (await handleEventPaymentWebhook(event)) {
          return res.json({ received: true });
        }
      } catch (error) {
        console.error(
          "Event payment webhook processing failed:",
          error.code || "database error"
        );
        return res.sendStatus(503);
      }
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

async function startServer() {
  try {
    await initializeDatabase();
  } catch (error) {
    console.error(
      "Event database initialization failed:",
      error.code || "database error"
    );
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

app.use((error, req, res, next) => {
  console.error(
    "Unhandled API request error:",
    error.code || error.type || "request error"
  );
  if (res.headersSent) return next(error);

  const status =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : 500;
  return res.status(status).json({
    error:
      status === 413
        ? "Request body is too large."
        : "The request could not be completed."
  });
});

startServer();