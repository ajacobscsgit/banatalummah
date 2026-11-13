"use strict";

const crypto = require("node:crypto");
const { isValidEmail } = require("./events-utils.js");

const PREFERENCE_KEYS = [
  "upcomingEvents",
  "arabicClasses",
  "generalUpdates"
];

function parseNewsletterSubscription(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { error: "Enter your email and choose at least one update." };
  }

  const email = typeof body.email === "string"
    ? body.email.trim().toLowerCase()
    : "";
  const rawFirstName = typeof body.firstName === "string"
    ? body.firstName.trim()
    : "";
  const firstName = rawFirstName.replace(/\s+/g, " ");

  if (!isValidEmail(email)) {
    return { error: "Enter a valid email address." };
  }
  if (
    (body.firstName !== undefined && typeof body.firstName !== "string") ||
    rawFirstName.length > 80 ||
    /[\u0000-\u001f\u007f]/.test(rawFirstName)
  ) {
    return { error: "Check the first name and try again." };
  }
  if (body.consent !== true) {
    return { error: "Please agree to the email preferences you select." };
  }

  const submittedPreferences = body.preferences;
  if (
    !submittedPreferences ||
    typeof submittedPreferences !== "object" ||
    Array.isArray(submittedPreferences) ||
    PREFERENCE_KEYS.some(key => typeof submittedPreferences[key] !== "boolean") ||
    Object.keys(submittedPreferences).some(key => !PREFERENCE_KEYS.includes(key))
  ) {
    return { error: "Choose your email preferences and try again." };
  }

  const preferences = Object.fromEntries(
    PREFERENCE_KEYS.map(key => [key, submittedPreferences[key]])
  );
  if (!Object.values(preferences).some(Boolean)) {
    return { error: "Choose at least one email preference." };
  }

  return {
    value: {
      email,
      firstName,
      preferences
    }
  };
}

function isValidNewsletterToken(token) {
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token);
}

function hashNewsletterToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

module.exports = {
  hashNewsletterToken,
  isValidNewsletterToken,
  parseNewsletterSubscription
};
