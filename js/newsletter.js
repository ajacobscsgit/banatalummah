"use strict";

(() => {
  const API_URL = "https://banatalummah.onrender.com";
  const LAST_SHOWN_KEY = "banatNewsletterLastShown";
  const DISMISSED_KEY = "banatNewsletterDismissedAt";
  const SHOW_AGAIN_AFTER = 7 * 24 * 60 * 60 * 1000;
  const DISMISS_FOR = 30 * 24 * 60 * 60 * 1000;
  const memoryTimestamps = {};
  const NEWSLETTER_DIALOG_MARKUP = `
    <dialog class="newsletter-dialog" id="newsletter-dialog" aria-labelledby="newsletter-title">
      <div class="newsletter-dialog-layout">
        <div class="newsletter-dialog-image">
          <img
            alt="Sisters sharing a moment together outdoors"
            loading="lazy"
          >
          <p>Knowledge is a journey best travelled together.</p>
        </div>
        <div class="newsletter-dialog-content">
          <button
            class="newsletter-close"
            type="button"
            data-close-newsletter
            aria-label="Close email signup"
          >×</button>
          <p class="eyebrow">Stay Connected</p>
          <h2 id="newsletter-title">A Little More Sisterhood in Your Inbox</h2>
          <p class="newsletter-dialog-description">
            Be the first to hear about upcoming classes, gatherings, events, and
            opportunities to support beneficial knowledge.
          </p>
          <form class="newsletter-form" id="newsletter-form">
            <label for="newsletter-first-name">First name <span>(optional)</span></label>
            <input id="newsletter-first-name" name="firstName" type="text" autocomplete="given-name" maxlength="80" disabled>
            <label for="newsletter-email">Email address</label>
            <input id="newsletter-email" name="email" type="email" autocomplete="email" maxlength="254" required disabled>
            <fieldset class="newsletter-preferences" disabled>
              <legend>What would you like to hear about?</legend>
              <label>
                <input type="checkbox" name="preferences" value="upcomingEvents">
                <span>Upcoming Events &amp; Gatherings</span>
              </label>
              <label>
                <input type="checkbox" name="preferences" value="arabicClasses">
                <span>Arabic Classes &amp; Workshops</span>
              </label>
              <label>
                <input type="checkbox" name="preferences" value="generalUpdates">
                <span>General Banat Al-Ummah Updates</span>
              </label>
            </fieldset>
            <label class="newsletter-consent">
              <input id="newsletter-consent" name="consent" type="checkbox" required disabled>
              <span>I agree to receive the updates I selected. I can unsubscribe at any time.</span>
            </label>
            <label class="newsletter-honeypot" aria-hidden="true">
              Leave this field empty
              <input name="website" type="text" tabindex="-1" autocomplete="off">
            </label>
            <p class="newsletter-status" id="newsletter-status" role="status" aria-live="polite">
              Checking subscription availability…
            </p>
            <button class="btn btn-primary newsletter-submit" type="submit" disabled>
              Subscribe
            </button>
            <p class="newsletter-privacy">
              Your email is kept private. We'll only send the updates you choose.
              Please confirm your email before receiving messages.
            </p>
          </form>
        </div>
      </div>
    </dialog>
  `;

  function readTimestamp(key) {
    try {
      return Number(localStorage.getItem(key)) || 0;
    } catch {
      return memoryTimestamps[key] || 0;
    }
  }

  function saveTimestamp(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      memoryTimestamps[key] = value;
      return false;
    }
    return true;
  }

  function setFormDisabled(form, disabled) {
    form.querySelectorAll("input, fieldset, button[type='submit']").forEach(control => {
      if (control.name !== "website") control.disabled = disabled;
    });
  }

  function createNewsletterDialog() {
    const template = document.createElement("template");
    template.innerHTML = NEWSLETTER_DIALOG_MARKUP;
    const image = template.content.querySelector(".newsletter-dialog-image img");
    const eventMedia = window.BANAT_EVENT_PAGE_MEDIA;
    image.addEventListener("error", () => {
      image.hidden = true;
    }, { once: true });
    image.src = eventMedia?.newsletterImage || "assets/images/journey-photo.jpg";
    if (eventMedia?.newsletterImage) {
      image.alt = "Sisters taking part in a community learning gathering";
    }
    document.body.appendChild(template.content);
    return document.getElementById("newsletter-dialog");
  }

  async function requestJSON(path, options) {
    const response = await fetch(`${API_URL}${path}`, options);
    let result;
    try {
      result = await response.json();
    } catch {
      throw new Error("The email service returned an unexpected response.");
    }

    if (!response.ok) {
      throw new Error(result.error || "Your request could not be completed.");
    }
    return result;
  }

  function initializeNewsletterAction() {
    const form = document.getElementById("newsletter-action-form");
    const status = document.getElementById("newsletter-action-status");
    if (!form || !status) return;

    const action = form.dataset.newsletterAction;
    const submit = form.querySelector("button[type='submit']");
    const token = new URLSearchParams(location.hash.slice(1)).get("token");
    if (!token || !["confirm", "unsubscribe"].includes(action)) {
      status.textContent =
        "This email link is invalid or incomplete. Please use the link from your Banāt al-Ummah email.";
      return;
    }

    form.hidden = false;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      submit.disabled = true;
      status.textContent = action === "confirm"
        ? "Confirming your email…"
        : "Updating your email preferences…";
      try {
        const result = await requestJSON(
          `/api/newsletter-subscriptions/${action}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token })
          }
        );
        status.textContent = result.message;
        form.hidden = true;
      } catch (error) {
        status.textContent =
          error instanceof TypeError
            ? "We could not reach the email service. Please try again later."
            : error.message;
        submit.disabled = false;
      }
    });
  }

  function initializeNewsletter() {
    initializeNewsletterAction();
    const existingDialog = document.getElementById("newsletter-dialog");
    const dialog = existingDialog ||
      (document.body.hasAttribute("data-newsletter-popup")
        ? createNewsletterDialog()
        : null);
    const form = document.getElementById("newsletter-form");
    const status = document.getElementById("newsletter-status");
    if (!dialog || !form || !status) return;

    const submit = form.querySelector("button[type='submit']");
    let serviceAvailable = false;
    let previouslyFocused = null;

    async function checkServiceAvailability() {
      setFormDisabled(form, true);
      try {
        const health = await requestJSON("/api/health");
        serviceAvailable = health.newsletterAvailable === true;
        if (serviceAvailable) {
          setFormDisabled(form, false);
          status.textContent =
            "Choose your interests and confirm your email to join the list.";
        } else {
          status.textContent =
            "Newsletter signup is not configured on the server yet. Please try again later.";
        }
      } catch (error) {
        serviceAvailable = false;
        status.textContent = error instanceof TypeError
          ? "We could not connect to the newsletter service. Please try again later."
          : error.message;
      }
    }

    function openDialog() {
      if (dialog.open) return;
      previouslyFocused = document.activeElement;
      dialog.showModal();
      const image = dialog.querySelector(".newsletter-dialog-image img");
      if (image) image.loading = "eager";
      saveTimestamp(LAST_SHOWN_KEY, Date.now());
    }

    function closeDialog() {
      if (dialog.open) dialog.close();
    }

    document.querySelectorAll("[data-open-newsletter]").forEach(button => {
      button.addEventListener("click", openDialog);
    });
    dialog.querySelector("[data-close-newsletter]")?.addEventListener(
      "click",
      closeDialog
    );
    dialog.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeDialog();
      }
    });
    dialog.addEventListener("cancel", closeDialog);
    dialog.addEventListener("close", () => {
      saveTimestamp(DISMISSED_KEY, Date.now());
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    });

    const automaticDelay = 10000;
    window.setTimeout(() => {
      const now = Date.now();
      const lastShown = readTimestamp(LAST_SHOWN_KEY);
      const dismissedAt = readTimestamp(DISMISSED_KEY);
      if (
        now - lastShown >= SHOW_AGAIN_AFTER &&
        now - dismissedAt >= DISMISS_FOR
      ) {
        openDialog();
      }
    }, automaticDelay);

    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!serviceAvailable) {
        status.textContent =
          "Email signup is temporarily unavailable. Please try again later.";
        return;
      }

      const data = new FormData(form);
      const selected = new Set(data.getAll("preferences"));
      const preferences = {
        upcomingEvents: selected.has("upcomingEvents"),
        arabicClasses: selected.has("arabicClasses"),
        generalUpdates: selected.has("generalUpdates")
      };
      if (!Object.values(preferences).some(Boolean)) {
        status.textContent = "Select at least one email preference to continue.";
        return;
      }
      if (data.get("consent") !== "on") {
        status.textContent = "Please confirm your email preferences to continue.";
        return;
      }
      if (data.get("website")) {
        status.textContent = "Your request could not be processed.";
        return;
      }

      submit.disabled = true;
      status.textContent = "Sending your confirmation request…";
      try {
        const result = await requestJSON("/api/newsletter/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName: data.get("firstName"),
            email: data.get("email"),
            preferences,
            consent: true,
            website: data.get("website")
          })
        });
        status.textContent = result.message;
        setFormDisabled(form, true);
        saveTimestamp(DISMISSED_KEY, Date.now());
      } catch (error) {
        status.textContent =
          error instanceof TypeError
            ? "We could not reach the email service. Please try again later."
            : error.message;
        submit.disabled = false;
      }
    });

    checkServiceAvailability();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeNewsletter);
  } else {
    initializeNewsletter();
  }
})();
