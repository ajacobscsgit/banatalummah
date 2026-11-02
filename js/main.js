
/* ==========================================
   BANĀT AL-UMMAH
   Main JavaScript

   Shared across:
   - index.html
   - about.html
   - journey.html
========================================== */

"use strict";

/* ==========================================
   1. CONFIGURATION
========================================== */

// Replace with your official LaunchGood
// or Givebutter fundraising campaign URL.

const DONATION_URL = "donate.html";
const PROGRESS_API_URL = "https://banatalummah.onrender.com/api/progress";

function initializeHeroFundraisingProgress() {
  const total = document.getElementById("hero-fundraising-total");
  const bar = document.getElementById("hero-fundraising-progress");
  const detail = document.getElementById("hero-fundraising-detail");

  if (!total || !bar || !detail) return;

  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  fetch(PROGRESS_API_URL)
    .then(response => {
      if (!response.ok) {
        throw new Error("Fundraising progress request failed.");
      }

      return response.json();
    })
    .then(progress => {
      if (
        !Number.isSafeInteger(progress.raisedInCents) ||
        progress.raisedInCents < 0 ||
        !Number.isSafeInteger(progress.goalInCents) ||
        progress.goalInCents <= 0 ||
        !Number.isSafeInteger(progress.contributionCount) ||
        progress.contributionCount < 0
      ) {
        throw new Error("Invalid fundraising progress response.");
      }

      const percent =
        progress.raisedInCents / progress.goalInCents * 100;

      total.textContent =
        `${money.format(progress.raisedInCents / 100)} raised of ` +
        `${money.format(progress.goalInCents / 100)}`;
      bar.max = progress.goalInCents;
      bar.value = Math.min(progress.raisedInCents, progress.goalInCents);
      bar.setAttribute(
        "aria-valuetext",
        `${money.format(progress.raisedInCents / 100)} raised, ` +
        `${percent.toFixed(1)} percent of goal`
      );
      detail.textContent =
        `${percent.toFixed(1)}% funded · ` +
        `${progress.contributionCount} confirmed ` +
        `${progress.contributionCount === 1 ? "contribution" : "contributions"}`;
    })
    .catch(() => {
      total.textContent = "Confirmed total temporarily unavailable.";
      detail.textContent = "Visit our support page to check again.";
    });
}

/* ==========================================
   2. MOBILE NAVIGATION
========================================== */

function initializeMobileNavigation() {

  const menuToggle = document.querySelector(".menu-toggle");
  const siteNav = document.querySelector(".site-nav");

  if (!menuToggle || !siteNav) return;

  function closeMenu() {
    siteNav.classList.remove("is-open");

    menuToggle.setAttribute(
      "aria-expanded",
      "false"
    );

    menuToggle.setAttribute(
      "aria-label",
      "Open navigation"
    );
  }

  menuToggle.addEventListener("click", () => {

    const isOpen = siteNav.classList.toggle("is-open");

    menuToggle.setAttribute(
      "aria-expanded",
      String(isOpen)
    );

    menuToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation" : "Open navigation"
    );

  });

  // Close menu when a navigation link is selected.

  siteNav.querySelectorAll("a").forEach(link => {

    link.addEventListener("click", () => {
      closeMenu();
    });

  });

  // Close menu when Escape is pressed.

  document.addEventListener("keydown", event => {

    if (event.key === "Escape") {
      closeMenu();
    }

  });

  // Close menu when clicking outside navigation.

  document.addEventListener("click", event => {

    if (
      !siteNav.contains(event.target) &&
      !menuToggle.contains(event.target)
    ) {
      closeMenu();
    }

  });

}

/* ==========================================
   3. DONATION BUTTONS
========================================== */

function initializeDonationLinks() {

  document.querySelectorAll("[data-donate]").forEach(link => {
    link.href = DONATION_URL;

    // Open our donation page in the same tab.
    link.removeAttribute("target");
    link.removeAttribute("rel");
  });

  const donationNote = document.getElementById("donation-note");

  if (donationNote) {
    donationNote.textContent =
      "Visit our support page for contribution information and availability.";
  }
}

/* ==========================================
   4. COPYRIGHT YEAR
========================================== */

function updateCopyrightYear() {

  const yearElement = document.getElementById("year");

  if (yearElement) {

    yearElement.textContent =
      new Date().getFullYear();

  }

}

/* ==========================================
   5. SOCIAL LINKS
========================================== */

function initializeSocialLinks() {
  const links = [
    ["Instagram", ""],
    ["YouTube", ""],
    ["LinkedIn", ""],
    ["TikTok", ""],
    ["X", ""],
    ["Facebook", ""]
  ];

  const container = document.getElementById("social-links");
  const note = document.getElementById("social-links-note");

  if (!container) return;

  container.replaceChildren();

  for (const [label, address] of links) {
    if (!address) continue;

    try {
      const url = new URL(address);

      if (url.protocol !== "https:") continue;

      const link = document.createElement("a");

      link.href = url.href;
      link.textContent = label;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      container.appendChild(link);
    } catch {
      console.warn(`Check the ${label} profile URL.`);
    }
  }

  if (note) {
    note.hidden = container.children.length > 0;
  }
}

/* ==========================================
   6. INITIALIZE WEBSITE
========================================== */

function initializeWebsite() {

  initializeMobileNavigation();

  initializeDonationLinks();

  updateCopyrightYear();

  initializeSocialLinks();

  initializeHeroFundraisingProgress();

}

// Runs after the HTML document is loaded.

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    initializeWebsite
  );

} else {

  initializeWebsite();

}
