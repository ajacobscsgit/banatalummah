"use strict";

(() => {
  const API_URL = "https://banatalummah.onrender.com";
  const events = window.BANAT_EVENTS || [];
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  });

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function eventTitle(event, index) {
    return event.kind === "placeholder"
      ? `Future opportunity ${index}`
      : event.title;
  }

  function getEvent(eventId) {
    return events.find(event => event.id === eventId);
  }

  async function requestJSON(path, options) {
    const response = await fetch(`${API_URL}${path}`, options);
    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error(
        "The event service is not available yet. Please try again later."
      );
    }

    if (!response.ok) {
      throw new Error(result.error || "The event request could not be completed.");
    }

    return result;
  }

  function getEmailActionToken() {
    const fragment = location.hash.startsWith("#")
      ? location.hash.slice(1)
      : location.hash;
    return new URLSearchParams(fragment).get("token");
  }

  function createInterestForm(eventId = "") {
    const form = createElement("form", "event-interest-form");
    form.dataset.eventInterestForm = "";

    const eventLabel = createElement("label", "", "Event");
    eventLabel.htmlFor = "interest-event";
    const eventSelect = document.createElement("select");
    eventSelect.id = "interest-event";
    eventSelect.name = "eventId";
    eventSelect.required = true;

    events.forEach((event, index) => {
      const option = document.createElement("option");
      option.value = event.id;
      option.textContent = eventTitle(event, index);
      option.selected = event.id === eventId;
      eventSelect.appendChild(option);
    });

    const emailLabel = createElement("label", "", "Email address");
    emailLabel.htmlFor = "interest-email";
    const email = document.createElement("input");
    email.id = "interest-email";
    email.name = "email";
    email.type = "email";
    email.autocomplete = "email";
    email.maxLength = 254;
    email.required = true;

    const consentLabel = createElement("label", "event-consent");
    const consent = document.createElement("input");
    consent.name = "consent";
    consent.type = "checkbox";
    consent.required = true;
    const consentText = createElement(
      "span",
      "",
      "I agree to receive email updates about the selected event. I can unsubscribe at any time."
    );
    consentLabel.append(consent, consentText);

    const honeypotLabel = createElement("label", "event-honeypot", "Leave this field empty");
    honeypotLabel.setAttribute("aria-hidden", "true");
    const honeypot = document.createElement("input");
    honeypot.name = "website";
    honeypot.type = "text";
    honeypot.tabIndex = -1;
    honeypot.autocomplete = "off";
    honeypotLabel.appendChild(honeypot);

    const submit = createElement("button", "btn btn-primary", "Join the Interest List");
    submit.type = "submit";
    const status = createElement("p", "event-form-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    form.append(
      eventLabel,
      eventSelect,
      emailLabel,
      email,
      consentLabel,
      honeypotLabel,
      submit,
      status
    );
    return form;
  }

  function getUpcomingDates(event, count = 8, offset = 0) {
    if (!event.firstSessionDate) return [];

    const dates = [];
    const first = new Date(`${event.firstSessionDate}T00:00:00Z`);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    while (first < today) {
      first.setUTCDate(first.getUTCDate() + 7);
    }

    for (let index = 0; index < count; index += 1) {
      const date = new Date(first);
      date.setUTCDate(date.getUTCDate() + (index + offset) * 7);
      dates.push(date.toISOString().slice(0, 10));
    }

    return dates;
  }

  function createRegistrationForm(event) {
    const form = createElement("form", "event-interest-form paid-event-registration");
    form.dataset.eventRegistrationForm = "";

    const nameLabel = createElement("label", "", "Full name");
    nameLabel.htmlFor = "registration-name";
    const name = document.createElement("input");
    name.id = "registration-name";
    name.name = "fullName";
    name.type = "text";
    name.autocomplete = "name";
    name.maxLength = 120;
    name.required = true;

    const emailLabel = createElement("label", "", "Email address");
    emailLabel.htmlFor = "registration-email";
    const email = document.createElement("input");
    email.id = "registration-email";
    email.name = "email";
    email.type = "email";
    email.autocomplete = "email";
    email.maxLength = 254;
    email.required = true;

    const sessionLabel = createElement("label", "", "Choose a class session");
    sessionLabel.htmlFor = "registration-session";
    const sessionSelect = document.createElement("select");
    sessionSelect.id = "registration-session";
    sessionSelect.name = "sessionDate";
    sessionSelect.required = true;
    const dateFormatter = new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC"
    });

    let weeksShown = 0;
    function appendUpcomingDates(count) {
      getUpcomingDates(event, count, weeksShown).forEach(dateValue => {
        const option = document.createElement("option");
        option.value = dateValue;
        const date = new Date(`${dateValue}T12:00:00Z`);
        option.textContent = dateFormatter.format(date);
        sessionSelect.appendChild(option);
      });
      weeksShown += count;
    }

    appendUpcomingDates(8);
    const showMoreDates = createElement(
      "button",
      "event-more-dates",
      "Show more dates"
    );
    showMoreDates.type = "button";
    showMoreDates.addEventListener("click", () => appendUpcomingDates(8));

    const consentLabel = createElement("label", "event-consent");
    const consent = document.createElement("input");
    consent.type = "checkbox";
    consent.name = "consent";
    consent.required = true;
    const consentText = createElement(
      "span",
      "",
      "I have reviewed and agree to the event details and policies above."
    );
    consentLabel.append(consent, consentText);

    const submit = createElement("button", "btn btn-primary", "Continue to secure payment");
    submit.type = "submit";
    const status = createElement("p", "event-form-status");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    const idempotencyKey = crypto.randomUUID();

    form.append(
      nameLabel,
      name,
      emailLabel,
      email,
      sessionLabel,
      sessionSelect,
      showMoreDates,
      consentLabel,
      submit,
      status
    );

    form.addEventListener("submit", async submitEvent => {
      submitEvent.preventDefault();
      if (!sessionSelect.value) {
        status.textContent = "Choose a class session.";
        return;
      }

      const formData = new FormData(form);
      submit.disabled = true;
      status.textContent = "Preparing secure checkout…";

      try {
        const result = await requestJSON("/api/event-registrations", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey
          },
          body: JSON.stringify({
            eventId: event.id,
            fullName: formData.get("fullName"),
            email: formData.get("email"),
            sessionDate: formData.get("sessionDate"),
            consent: formData.get("consent") === "on"
          })
        });
        location.assign(result.checkoutUrl);
      } catch (error) {
        status.textContent =
          error instanceof TypeError
            ? "We could not reach the registration service. Please try again later."
            : error.message;
        submit.disabled = false;
      }
    });

    return form;
  }

  function setupInterestForms() {
    document.querySelectorAll("[data-event-interest-form]").forEach(form => {
      const eventSelect = form.querySelector('select[name="eventId"]');

      if (eventSelect && eventSelect.options.length === 0) {
        events.forEach((event, index) => {
          const option = document.createElement("option");
          option.value = event.id;
          option.textContent = eventTitle(event, index);
          eventSelect.appendChild(option);
        });
      }

      form.addEventListener("submit", async event => {
        event.preventDefault();
        const submit = form.querySelector('button[type="submit"]');
        const status = form.querySelector(".event-form-status");
        const formData = new FormData(form);

        submit.disabled = true;
        status.textContent = "Submitting your request…";

        try {
          const result = await requestJSON("/api/event-interests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId: formData.get("eventId"),
              email: formData.get("email"),
              consent: formData.get("consent") === "on",
              website: formData.get("website")
            })
          });

          status.textContent =
            result.message || "Your interest has been recorded.";
          form.reset();
        } catch (error) {
          status.textContent =
            error instanceof TypeError
              ? "We could not reach the event service. Please try again later."
              : error.message;
        } finally {
          submit.disabled = false;
        }
      });
    });
  }

  function createEventCard(event, index) {
    const article = createElement(
      "article",
      `event-card${event.kind === "featured" ? " event-card-featured" : ""}`
    );
    article.dataset.category = event.category;

    const artwork = createElement("div", "event-card-artwork");
    artwork.setAttribute("aria-hidden", "true");
    const motif = createElement("span", "event-card-motif", "ب");
    artwork.appendChild(motif);

    const content = createElement("div", "event-card-content");
    const status = createElement(
      "p",
      "event-status",
      event.registrationEnabled ? "Registration open" : event.statusLabel
    );
    const heading = createElement("h3");
    const title = createElement("a", "", eventTitle(event, index));
    title.href = `event.html?event=${encodeURIComponent(event.id)}`;
    heading.appendChild(title);
    const summary = createElement("p", "event-card-summary", event.summary);
    const metadata = createElement("p", "event-card-meta");
    if (event.firstSessionDate) {
      const date = new Date(`${event.firstSessionDate}T12:00:00`);
      metadata.textContent =
        `Proposed start: ${new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric"
        }).format(date)} · ${event.format}`;
    } else {
      metadata.textContent = "Dates and details to be announced";
    }

    const link = createElement(
      "a",
      "event-card-link",
      event.kind === "featured" ? "View class details" : "Learn more"
    );
    link.href = `event.html?event=${encodeURIComponent(event.id)}`;
    link.setAttribute("aria-label", `${link.textContent}: ${title.textContent}`);
    link.append(" ", document.createTextNode("→"));

    content.append(status, heading, summary, metadata, link);
    article.append(artwork, content);
    return article;
  }

  function initializeEventsList() {
    const list = document.getElementById("events-list");
    if (!list) return;

    list.replaceChildren(...events.map(createEventCard));
    setupInterestForms();

    const empty = document.getElementById("events-empty");
    let activeFilter = "all";
    const filters = [...document.querySelectorAll("[data-filter]")];

    function applyFilter(filter) {
      activeFilter = filter;
      const cards = [...list.children];
      let visibleCount = 0;

      cards.forEach(card => {
        const visible =
          activeFilter === "all" ||
          card.dataset.category === activeFilter;
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      empty.hidden = visibleCount > 0;
      list.scrollTo({ left: 0, behavior: "smooth" });
    }

    filters.forEach(button => {
      button.addEventListener("click", () => {
        filters.forEach(filter => {
          const selected = filter === button;
          filter.classList.toggle("is-active", selected);
          filter.setAttribute("aria-pressed", String(selected));
        });
        applyFilter(button.dataset.filter);
      });
    });

    document.querySelectorAll("[data-carousel-step]").forEach(button => {
      button.addEventListener("click", () => {
        const visibleCard = list.querySelector(".event-card:not([hidden])");
        if (!visibleCard) return;
        const direction = Number(button.dataset.carouselStep);
        const styles = getComputedStyle(list);
        const gap = Number.parseFloat(styles.columnGap) || 0;
        list.scrollBy({
          left: direction * (visibleCard.getBoundingClientRect().width + gap),
          behavior: "smooth"
        });
      });
    });
  }

  function initializeEventDetail() {
    const container = document.getElementById("event-detail");
    if (!container) return;

    const id = new URLSearchParams(location.search).get("event");
    const event = getEvent(id);

    if (!event) {
      container.append(
        createElement("h1", "", "Event not found"),
        createElement(
          "p",
          "",
          "This event may have moved or is no longer available."
        )
      );
      return;
    }

    const index = events.indexOf(event);
    const article = createElement("article", "event-detail");
    const heading = createElement("h1", "", eventTitle(event, index));
    const status = createElement("p", "event-status", event.statusLabel);
    const description = createElement("p", "event-detail-description", event.description);
    const details = createElement("dl", "event-facts");
    const facts = event.kind === "featured"
      ? [
          ["Schedule", `${event.weekday}s, ${event.startTime}–${event.endTime} Eastern`],
          ["Proposed start", new Intl.DateTimeFormat("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric"
          }).format(new Date(`${event.firstSessionDate}T12:00:00`))],
          ["Format", event.format],
          ["Location", event.location],
          ["Cost", `${money.format(event.priceInCents / 100)} per session`]
        ]
      : [["Event details", "Dates, schedule, and location will be announced."]];

    if (event.registrationPolicy) {
      facts.push(
        ["Who may register", event.registrationPolicy.eligibility],
        ["Registration deadline", event.registrationPolicy.registrationDeadline],
        ["Cancellation and refunds", event.registrationPolicy.cancellationRefundPolicy],
        ["Location details", event.registrationPolicy.locationDetails]
      );
    }

    facts.forEach(([term, value]) => {
      details.append(
        createElement("dt", "", term),
        createElement("dd", "", value)
      );
    });

    const note = createElement(
      "p",
      "event-detail-note",
      event.registrationEnabled
        ? "Registration is open while available sessions remain."
        : event.detailsNote ||
            "Details will be shared when this opportunity is announced."
    );
    const actions = createElement("div", "event-detail-actions");
    const interest = createElement(
      "a",
      "btn btn-primary",
      event.registrationEnabled
        ? "Register for this event"
        : "Get updates about this event"
    );
    interest.href = `register.html?event=${encodeURIComponent(event.id)}`;
    const allEvents = createElement("a", "text-link", "Explore all events");
    allEvents.href = "events.html";
    actions.append(interest, allEvents);
    article.append(status, heading, description, details, note, actions);
    container.appendChild(article);

    document.title = `${eventTitle(event, index)} | Banāt al-Ummah`;
  }

  function initializeRegistrationPage() {
    const container = document.getElementById("registration-content");
    if (!container) return;

    const id = new URLSearchParams(location.search).get("event");
    const event = getEvent(id);

    if (!event) {
      container.append(
        createElement("div", "event-state-card", "This event is not available.")
      );
      return;
    }

    const index = events.indexOf(event);
    const card = createElement("div", "event-state-card");
    card.append(
      createElement("p", "eyebrow", "Event Interest"),
      createElement("h1", "", eventTitle(event, index)),
      createElement(
        "p",
        "",
        event.registrationEnabled
          ? "Select a class session and enter your details to continue to secure payment."
          : "Registration and payment are not open yet. Share your email if you would like to receive an update when details are confirmed."
      )
    );

    const form = event.registrationEnabled
      ? createRegistrationForm(event)
      : createInterestForm(event.id);
    if (event.priceInCents) {
      card.appendChild(
        createElement(
          "p",
          "event-registration-price",
          `${money.format(event.priceInCents / 100)} per session`
        )
      );
    }
    if (event.registrationPolicy) {
      const policies = createElement("dl", "event-facts");
      [
        ["Who may register", event.registrationPolicy.eligibility],
        ["Registration deadline", event.registrationPolicy.registrationDeadline],
        ["Cancellation and refunds", event.registrationPolicy.cancellationRefundPolicy],
        ["Location details", event.registrationPolicy.locationDetails]
      ].forEach(([term, value]) => {
        policies.append(
          createElement("dt", "", term),
          createElement("dd", "", value)
        );
      });
      card.appendChild(policies);
    }
    card.appendChild(form);
    card.appendChild(
      createElement(
        "p",
        "fine-print",
        event.registrationEnabled
          ? "Your name and email are used to manage this registration. Stripe securely handles card details; Banāt al-Ummah does not store them."
          : "Your email is used only for the event updates you request. You must confirm it before receiving updates, and you can unsubscribe at any time."
      )
    );
    const back = createElement("a", "text-link", "Return to event details");
    back.href = `event.html?event=${encodeURIComponent(event.id)}`;
    card.appendChild(back);
    container.appendChild(card);
    setupInterestForms();
  }

  async function initializeRegistrationStatus() {
    const container = document.getElementById("registration-success");
    if (!container) return;

    const sessionId = new URLSearchParams(location.search).get("session_id");
    const heading = createElement("h1", "", "Checking registration status");
    const message = createElement("p", "", "Please wait while we verify your payment with Stripe.");
    container.append(heading, message);

    if (!sessionId) {
      heading.textContent = "No payment reference found";
      message.textContent =
        "This page can only confirm a registration after checkout has returned a payment reference.";
      return;
    }

    try {
      const result = await requestJSON(
        `/api/event-registration-status?session_id=${encodeURIComponent(sessionId)}`
      );

      if (result.status === "paid") {
        heading.textContent = "Your registration is confirmed";
        message.textContent =
          "Stripe confirmed your payment. A confirmation email will be sent to the address used during registration.";
      } else if (result.status === "partially_refunded") {
        heading.textContent = "A partial refund was recorded";
        message.textContent =
          `Stripe records a refund of ${money.format(result.refundedInCents / 100)}. ` +
          "Please contact banatalummah@gmail.com if you have questions about your registration.";
      } else if (result.status === "refunded") {
        heading.textContent = "Payment refunded";
        message.textContent =
          "Stripe records this payment as fully refunded. Contact banatalummah@gmail.com if you need help.";
      } else if (
        result.status === "disputed" ||
        result.status === "dispute_lost"
      ) {
        heading.textContent = "Payment under review";
        message.textContent =
          "Stripe records a payment dispute. Please contact banatalummah@gmail.com for assistance.";
      } else if (result.status === "dispute_won") {
        heading.textContent = "Your registration is confirmed";
        message.textContent =
          "Stripe resolved the payment dispute in your favor. Contact banatalummah@gmail.com if you need help.";
      } else if (result.status === "failed" || result.status === "expired") {
        heading.textContent = "Registration payment not completed";
        message.textContent =
          "This checkout was not completed. You can return to the event page for current registration information.";
      } else {
        heading.textContent = "Payment confirmation pending";
        message.textContent =
          "Your payment is not confirmed yet. Please wait a moment and refresh this page before trying checkout again.";
      }
    } catch (error) {
      heading.textContent = "Unable to verify your registration";
      message.textContent =
        error instanceof TypeError
          ? "We could not reach the event service. Please contact banatalummah@gmail.com before paying again."
          : error.message;
    }
  }

  function initializeUnsubscribe() {
    const form = document.getElementById("unsubscribe-form");
    if (!form) return;

    const token = getEmailActionToken();
    const message = document.getElementById("unsubscribe-message");
    if (!token || token.length > 200) {
      message.textContent =
        "This unsubscribe link is missing or invalid. Please contact banatalummah@gmail.com for help.";
      return;
    }

    form.hidden = false;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      message.textContent = "Updating your email preferences…";

      try {
        const result = await requestJSON("/api/event-interests/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        message.textContent = result.message;
        form.hidden = true;
      } catch (error) {
        message.textContent =
          error instanceof TypeError
            ? "We could not reach the event service. Please try again later."
            : error.message;
        button.disabled = false;
      }
    });
  }

  function initializeInterestConfirmation() {
    const form = document.getElementById("interest-confirm-form");
    if (!form) return;

    const token = getEmailActionToken();
    const message = document.getElementById("interest-confirm-message");
    if (!token || token.length > 200) {
      message.textContent =
        "This confirmation link is missing or invalid. Please submit your interest again.";
      return;
    }

    form.hidden = false;
    form.addEventListener("submit", async event => {
      event.preventDefault();
      const button = form.querySelector("button");
      button.disabled = true;
      message.textContent = "Confirming your email…";

      try {
        const result = await requestJSON("/api/event-interests/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });
        message.textContent = result.message;
        form.hidden = true;
      } catch (error) {
        message.textContent =
          error instanceof TypeError
            ? "We could not reach the event service. Please try again later."
            : error.message;
        button.disabled = false;
      }
    });
  }

  function initializeEvents() {
    initializeEventsList();
    initializeEventDetail();
    initializeRegistrationPage();
    initializeRegistrationStatus();
    initializeUnsubscribe();
    initializeInterestConfirmation();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeEvents);
  } else {
    initializeEvents();
  }
})();
