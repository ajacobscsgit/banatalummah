"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  hashNewsletterToken,
  isValidNewsletterToken,
  parseNewsletterSubscription
} = require("../newsletter-utils.js");

const validSubmission = {
  firstName: "  Amina   Noor ",
  email: " Sister@Example.org ",
  consent: true,
  preferences: {
    upcomingEvents: true,
    arabicClasses: false,
    generalUpdates: true
  }
};

test("newsletter signup normalizes email and name while retaining explicit choices", () => {
  const result = parseNewsletterSubscription(validSubmission);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.value, {
    email: "sister@example.org",
    firstName: "Amina Noor",
    preferences: {
      upcomingEvents: true,
      arabicClasses: false,
      generalUpdates: true
    }
  });
});

test("newsletter signup requires consent and at least one valid preference", () => {
  assert.match(
    parseNewsletterSubscription({ ...validSubmission, consent: false }).error,
    /agree/
  );
  assert.match(
    parseNewsletterSubscription({
      ...validSubmission,
      preferences: {
        upcomingEvents: false,
        arabicClasses: false,
        generalUpdates: false
      }
    }).error,
    /at least one/
  );
  assert.match(
    parseNewsletterSubscription({
      ...validSubmission,
      preferences: { ...validSubmission.preferences, unrelated: true }
    }).error,
    /preferences/
  );
});

test("newsletter signup rejects malformed email and unsafe first-name input", () => {
  assert.match(
    parseNewsletterSubscription({ ...validSubmission, email: "not-an-email" }).error,
    /valid email/
  );
  assert.match(
    parseNewsletterSubscription({
      ...validSubmission,
      firstName: "A".repeat(81)
    }).error,
    /first name/
  );
  assert.match(
    parseNewsletterSubscription({
      ...validSubmission,
      firstName: "Amina\nNoor"
    }).error,
    /first name/
  );
});

test("newsletter tokens must be random-token format and are stored as hashes", () => {
  const token = "a".repeat(64);
  assert.equal(isValidNewsletterToken(token), true);
  assert.equal(isValidNewsletterToken(token.toUpperCase()), false);
  assert.equal(isValidNewsletterToken("short"), false);
  assert.notEqual(hashNewsletterToken(token), token);
  assert.equal(hashNewsletterToken(token).length, 64);
});
