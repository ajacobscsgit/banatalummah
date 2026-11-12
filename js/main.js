
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

// The internal donation page uses Stripe Checkout.

const DONATION_URL = "donate.html";
const PROGRESS_API_URL = "https://banatalummah.onrender.com/api/progress";

function initializeFundraisingProgress(totalId, barId, detailId, percentId) {
  const total = totalId ? document.getElementById(totalId) : null;
  const bar = document.getElementById(barId);
  const detail = detailId ? document.getElementById(detailId) : null;
  const percentLabel = percentId
    ? document.getElementById(percentId)
    : null;

  if (!bar) return;

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
      const raised = money.format(progress.raisedInCents / 100);
      const remaining = money.format(
        Math.max(progress.goalInCents - progress.raisedInCents, 0) / 100
      );
      const summary =
        `${percent.toFixed(1)}% funded · ${raised} raised · ` +
        `${remaining} to go`;

      if (total) {
        total.textContent = summary;
      }

      if (bar instanceof HTMLProgressElement) {
        bar.max = progress.goalInCents;
        bar.value = Math.min(progress.raisedInCents, progress.goalInCents);
        bar.setAttribute("aria-valuetext", summary);
      } else {
        bar.style.width = `${Math.min(percent, 100)}%`;
        if (bar.parentElement) {
          bar.parentElement.setAttribute(
            "aria-valuenow",
            String(Math.min(percent, 100))
          );
          bar.parentElement.setAttribute(
            "aria-valuetext",
            summary
          );
        }
      }

      if (detail) {
        detail.textContent =
          `${progress.contributionCount} confirmed ` +
          `${progress.contributionCount === 1 ? "contribution" : "contributions"}`;
      }

      if (percentLabel) {
        percentLabel.textContent = summary;
      }
    })
    .catch(() => {
      if (total) {
        total.textContent = "Confirmed total temporarily unavailable.";
      }
      if (detail) {
        detail.textContent = "Visit our support page to check again.";
      }
      if (percentLabel) {
        percentLabel.textContent = "Progress temporarily unavailable.";
      }
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
      "Contributions are securely processed through Stripe Checkout.";
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
    {
      label: "Instagram",
      address: "https://www.instagram.com/banatalummah/",
      paths: [
        ["rect", { x: "3", y: "3", width: "18", height: "18", rx: "5" }],
        ["circle", { cx: "12", cy: "12", r: "4" }],
        ["circle", { cx: "18", cy: "6", r: "1", fill: "currentColor", stroke: "none" }]
      ]
    },
    {
      label: "YouTube",
      address: "https://www.youtube.com/channel/UCNI7_gzxOD7PwkKiajjPYfg",
      paths: [
        ["path", { d: "M22 12c0 2-.2 4-.6 5.2-.3.8-.9 1.4-1.7 1.7-1.3.4-7.7.4-7.7.4s-6.4 0-7.7-.4c-.8-.3-1.4-.9-1.7-1.7C2.2 16 2 14 2 12s.2-4 .6-5.2c.3-.8.9-1.4 1.7-1.7C5.6 4.7 12 4.7 12 4.7s6.4 0 7.7.4c.8.3 1.4.9 1.7 1.7.4 1.2.6 3.2.6 5.2Z" }],
        ["path", { d: "m10 8.5 5.5 3.5-5.5 3.5z", fill: "currentColor", stroke: "none" }]
      ]
    },
    {
      label: "LinkedIn",
      address: "https://www.linkedin.com/company/banatalummah/",
      paths: [
        ["path", { d: "M5 9h3v10H5zM6.5 5a1.75 1.75 0 1 0 0 3.5 1.75 1.75 0 0 0 0-3.5ZM11 9h3v1.4c.5-1 1.5-1.6 2.8-1.6 2.8 0 3.2 1.8 3.2 4.2V19h-3v-5.3c0-1.3-.1-2.4-1.5-2.4s-1.7 1.1-1.7 2.3V19h-3z", fill: "currentColor", stroke: "none" }]
      ]
    },
    {
      label: "TikTok",
      address: "https://www.tiktok.com/@bannatalummah",
      paths: [
        ["path", { d: "M15 3h3c.2 2 1.3 3.7 3 4.5v3.2a9 9 0 0 1-3-1v6.1a6.3 6.3 0 1 1-6.3-6.3c.5 0 1 .1 1.5.2v3.3a3 3 0 1 0 1.8 2.8V3Z" }]
      ]
    },
    {
      label: "Facebook",
      address: "https://www.facebook.com/profile.php?id=61596156151371",
      paths: [
        ["path", { d: "M13.5 21v-8h2.8l.4-3h-3.2V8.1c0-.9.3-1.5 1.6-1.5h1.7V3.9c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3V10H7.3v3h2.8v8z", fill: "currentColor", stroke: "none" }]
      ]
    }
  ];

  const container = document.getElementById("social-links");
  const note = document.getElementById("social-links-note");

  if (!container) return;

  container.replaceChildren();

  for (const { label, address, paths } of links) {
    try {
      const url = new URL(address);

      if (url.protocol !== "https:") continue;

      const link = document.createElement("a");

      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";

      const icon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      icon.setAttribute("class", "social-icon");
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");

      for (const [elementName, attributes] of paths) {
        const element = document.createElementNS(
          "http://www.w3.org/2000/svg",
          elementName
        );

        for (const [name, value] of Object.entries(attributes)) {
          element.setAttribute(name, value);
        }

        icon.appendChild(element);
      }

      const text = document.createElement("span");
      text.textContent = label;

      link.append(icon, text);
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

  initializeFundraisingProgress(
    "hero-fundraising-total",
    "hero-fundraising-progress",
    "hero-fundraising-detail"
  );
  initializeFundraisingProgress(
    null,
    "home-progress-bar",
    null,
    "home-progress-percent"
  );
  initializeFundraisingProgress(
    "journey-fundraising-total",
    "journey-fundraising-progress",
    "journey-fundraising-detail"
  );

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
