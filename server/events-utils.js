"use strict";

function isValidEmail(email) {
  return (
    typeof email === "string" &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function escapeHTML(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value).replace(/[&<>"']/g, character => entities[character]);
}

function isValidSessionDate(event, sessionDate) {
  if (
    !event?.firstSessionDate ||
    typeof sessionDate !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)
  ) {
    return false;
  }

  const first = new Date(`${event.firstSessionDate}T00:00:00Z`);
  const selected = new Date(`${sessionDate}T00:00:00Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  if (
    Number.isNaN(first.valueOf()) ||
    Number.isNaN(selected.valueOf()) ||
    selected.toISOString().slice(0, 10) !== sessionDate ||
    selected < first ||
    selected < today
  ) {
    return false;
  }

  const dayDifference =
    (selected.valueOf() - first.valueOf()) / (7 * 24 * 60 * 60 * 1000);

  return Number.isInteger(dayDifference);
}

function hasConfirmedRegistrationPolicy(event) {
  const policy = event?.registrationPolicy;

  return Boolean(
    policy &&
      typeof policy.eligibility === "string" &&
      policy.eligibility.trim() &&
      typeof policy.registrationDeadline === "string" &&
      policy.registrationDeadline.trim() &&
      typeof policy.cancellationRefundPolicy === "string" &&
      policy.cancellationRefundPolicy.trim() &&
      typeof policy.locationDetails === "string" &&
      policy.locationDetails.trim() &&
      Number.isSafeInteger(event.capacityPerSession) &&
      event.capacityPerSession > 0 &&
      event.capacityPerSession <= 2147483647 &&
      Number.isSafeInteger(event.priceInCents) &&
      event.priceInCents >= 100 &&
      event.currency === "USD"
  );
}

function isRegistrationOpen(event, featureEnabled) {
  return Boolean(
    featureEnabled &&
      event?.kind === "featured" &&
      event.firstSessionDate &&
      event?.registrationEnabled === true &&
      hasConfirmedRegistrationPolicy(event)
  );
}

module.exports = {
  escapeHTML,
  hasConfirmedRegistrationPolicy,
  isRegistrationOpen,
  isValidEmail,
  isValidSessionDate
};
