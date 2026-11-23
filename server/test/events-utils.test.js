"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const EVENTS = require("../../js/events-data.js");
const {
  escapeHTML,
  hasConfirmedRegistrationPolicy,
  isRegistrationOpen,
  isValidEmail,
  isValidSessionDate
} = require("../events-utils.js");

function nextWednesday() {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  const daysUntilWednesday = (3 - date.getUTCDay() + 7) % 7 || 7;
  date.setUTCDate(date.getUTCDate() + daysUntilWednesday);
  return date;
}

test("event data opens Arabic class registration and keeps five placeholders closed", () => {
  assert.equal(EVENTS.length, 7);
  const arabic = EVENTS.find(event => event.id === "weekly-arabic-classes");
  assert.ok(arabic);
  assert.equal(arabic.title, "Egyptian Arabic Classes");
  assert.equal(arabic.subtitle, "Level 1 | Egyptian Arabic Classes");
  assert.equal(arabic.registrationEnabled, false);
  assert.equal(arabic.statusLabel, "Registration Open");
  assert.equal(arabic.heroBadge, "CURRENTLY ENROLLING · LEVEL 1");
  assert.equal(arabic.priceInCents, 1100);
  assert.equal(arabic.monthlyPriceInCents, 4000);
  assert.equal(arabic.capacityPerSession, 15);
  assert.equal(arabic.firstSessionDate, "2026-11-25");
  assert.equal(arabic.lastSessionDate, "2027-05-26");
  assert.equal(
    new Date(`${arabic.lastSessionDate}T12:00:00Z`).getUTCDay(),
    3
  );
  assert.equal(arabic.location, "Cleveland, Ohio");
  assert.equal(
    arabic.registrationUrl,
    "https://docs.google.com/forms/d/e/1FAIpQLSczB6kg91zSdDwvDgb9an7Bg6RRvHMKbT_EhzQlFbY5mgM12g/viewform"
  );
  assert.equal(
    arabic.paymentUrl,
    "https://buy.stripe.com/7sYbJ0bCs8Yjb045oX08g01"
  );
  assert.equal(arabic.firstPaymentDue, "November 20, 2026, 11:59 PM");
  assert.equal(
    arabic.details.find(([label]) => label === "Current level")[1],
    "Level 1 | Egyptian Arabic · Beginner"
  );
  assert.equal(arabic.parking, undefined);
  assert.equal(
    arabic.details.find(([label]) => label === "Location")[1],
    "Cleveland, Ohio, exact address provided privately to confirmed participants"
  );
  assert.equal(EVENTS.filter(event => event.kind === "placeholder").length, 5);
  assert.ok(
    EVENTS.filter(event => event.kind === "placeholder")
      .every(event => event.statusLabel === "Details coming soon")
  );
  assert.ok(
    EVENTS.filter(event => event.kind === "placeholder")
      .every(event => !event.firstSessionDate && !event.priceInCents)
  );
});

test("community giveaway is featured and includes donation details", () => {
  const giveaway = EVENTS.find(
    event => event.id === "community-giveaway-donation-drive"
  );
  assert.ok(giveaway);
  assert.equal(giveaway.featured, true);
  assert.equal(giveaway.title, "Community Giveaway & Donation Drive");
  assert.equal(giveaway.donationDeadline, "2026-12-10");
  assert.equal(giveaway.dropoffLocation, "Drop-Off Location Coming Soon");
  assert.equal(giveaway.donationUrl, "donate.html");
  assert.equal(giveaway.participationFormEnabled, true);
  assert.equal(giveaway.dropoffSchedule.length, 4);
  assert.equal(giveaway.acceptedItems.length, 8);
  assert.ok(giveaway.donationRequirements.length >= 6);
});

test("email validation rejects malformed and oversized values", () => {
  assert.equal(isValidEmail("sister@example.org"), true);
  assert.equal(isValidEmail("sister@"), false);
  assert.equal(isValidEmail("sister @example.org"), false);
  assert.equal(isValidEmail(`${"a".repeat(250)}@example.org`), false);
});

test("email HTML output escapes user-controlled characters", () => {
  assert.equal(
    escapeHTML(`<img src="x" onerror='bad'>&`),
    "&lt;img src=&quot;x&quot; onerror=&#39;bad&#39;&gt;&amp;"
  );
});

test("class session dates must be future weekly dates from the first session", () => {
  const first = nextWednesday();
  const firstDate = first.toISOString().slice(0, 10);
  const next = new Date(first);
  next.setUTCDate(next.getUTCDate() + 7);
  const nextDate = next.toISOString().slice(0, 10);
  const offSchedule = new Date(first);
  offSchedule.setUTCDate(offSchedule.getUTCDate() + 1);
  const past = new Date(first);
  past.setUTCDate(past.getUTCDate() - 14);
  const event = { firstSessionDate: firstDate };

  assert.equal(isValidSessionDate(event, firstDate), true);
  assert.equal(isValidSessionDate(event, nextDate), true);
  assert.equal(
    isValidSessionDate(event, offSchedule.toISOString().slice(0, 10)),
    false
  );
  assert.equal(
    isValidSessionDate(event, past.toISOString().slice(0, 10)),
    false
  );
  assert.equal(isValidSessionDate(event, "2026-02-30"), false);
});

test("registration stays closed until every policy and capacity is set", () => {
  const event = {
    kind: "featured",
    firstSessionDate: "2026-11-25",
    priceInCents: 1100,
    currency: "USD",
    registrationEnabled: true,
    capacityPerSession: null,
    registrationPolicy: null
  };
  assert.equal(isRegistrationOpen(event, true), false);
  assert.equal(hasConfirmedRegistrationPolicy(event), false);

  event.capacityPerSession = 12;
  event.registrationPolicy = {
    eligibility: "Confirmed",
    registrationDeadline: "Confirmed",
    cancellationRefundPolicy: "Confirmed",
    locationDetails: "Greater Cleveland Area, Ohio"
  };
  assert.equal(hasConfirmedRegistrationPolicy(event), true);
  assert.equal(isRegistrationOpen(event, false), false);
  assert.equal(isRegistrationOpen(event, true), true);
});
