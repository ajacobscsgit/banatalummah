
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

const DONATION_URL = "https://givebutter.com/ilmihsan";

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

  const donationButtons = document.querySelectorAll(
    "[data-donate]"
  );

  if (!DONATION_URL.trim()) {

    // Until a campaign URL is added,
    // direct visitors to the support section.

    donationButtons.forEach(button => {

      button.href = "index.html#support";

      button.removeAttribute("target");
      button.removeAttribute("rel");

    });

    return;
  }

  // Only allow valid HTTPS donation links.

  let verifiedURL;

  try {

    verifiedURL = new URL(DONATION_URL);

    if (verifiedURL.protocol !== "https:") {
      throw new Error("Donation URL must use HTTPS.");
    }

  } catch (error) {

    console.error(
      "Invalid donation URL:",
      error.message
    );

    return;
  }

  donationButtons.forEach(button => {

    button.href = verifiedURL.href;

    // Open external campaign in a new tab.

    button.target = "_blank";

    button.rel = "noopener noreferrer";

  });

  // Update homepage donation note.

  const donationNote = document.getElementById(
    "donation-note"
  );

  if (donationNote) {

    donationNote.textContent =
      "Donations are securely processed through " +
      "our external fundraising platform.";

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
   5. INITIALIZE WEBSITE
========================================== */

function initializeWebsite() {

  initializeMobileNavigation();

  initializeDonationLinks();

  updateCopyrightYear();

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
