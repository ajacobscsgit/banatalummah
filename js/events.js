"use strict";

(() => {
  const API_URL = "https://banatalummah.onrender.com";
  const ARABIC_CLASSES_ID = "weekly-arabic-classes";
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

  function hideUnavailableImage(image) {
    const hideImage = () => {
      image.hidden = true;
    };
    image.addEventListener("error", hideImage, { once: true });
    if (image.getAttribute("src") && image.complete && image.naturalWidth === 0) {
      hideImage();
    }
  }

  function eventTitle(event, index) {
    return event.kind === "placeholder"
      ? `Future opportunity ${index}`
      : event.title;
  }

  function getEvent(eventId) {
    return events.find(event => event.id === eventId);
  }

  function createExternalLink(className, text, href) {
    const link = createElement("a", className, text);
    link.href = href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
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
    const article = createElement("article", "event-card");
    article.dataset.category = event.category;

    const cover = createElement("div", "event-card-cover");
    cover.dataset.theme = event.coverTheme || "sage";
    if (event.cardImage) {
      const image = createElement("img");
      image.alt = event.cardAlt || "";
      image.loading = "lazy";
      hideUnavailableImage(image);
      image.src = event.cardImage;
      cover.appendChild(image);
    } else {
      cover.setAttribute("aria-hidden", "true");
      const placeholder = createElement(
        "span",
        "event-card-placeholder",
        "A new opportunity is taking shape"
      );
      cover.appendChild(placeholder);
    }
    const category = createElement("span", "event-card-category", event.category);
    cover.appendChild(category);

    const content = createElement("div", "event-card-content");
    const status = createElement(
      "p",
      "event-card-status",
      event.kind === "placeholder"
        ? "Coming Soon"
        : event.registrationEnabled
          ? "Registration Open"
          : event.statusLabel
    );
    const heading = createElement("h3");
    const title = createElement("a", "", eventTitle(event, index));
    title.href = `event.html?event=${encodeURIComponent(event.id)}`;
    heading.appendChild(title);
    const subtitle = event.subtitle
      ? createElement("p", "event-card-subtitle", event.subtitle)
      : null;
    const summary = createElement("p", "event-card-summary", event.summary);
    const metadata = createElement("ul", "event-card-facts");
    if (event.cardFacts) {
      event.cardFacts.forEach(line => {
        metadata.appendChild(createElement("li", "", line));
      });
    } else if (event.firstSessionDate) {
      metadata.appendChild(
        createElement(
          "li",
          "",
          event.firstSessionDate
            ? new Intl.DateTimeFormat("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric"
              }).format(new Date(`${event.firstSessionDate}T12:00:00`))
            : "No date announced"
        )
      );
    }

    const link = createElement(
      "a",
      "event-card-link",
      "View Details"
    );
    link.href = `event.html?event=${encodeURIComponent(event.id)}`;
    link.setAttribute("aria-label", `${link.textContent}: ${title.textContent}`);
    link.append(" ", document.createTextNode("→"));

    content.append(status, heading);
    if (subtitle) content.appendChild(subtitle);
    content.appendChild(summary);
    if (metadata.children.length) content.appendChild(metadata);
    content.appendChild(link);
    article.append(cover, content);
    return article;
  }

  function initializeEventsPageMedia() {
    if (!document.body.classList.contains("events-page")) return;
    const media = window.BANAT_EVENT_PAGE_MEDIA;
    if (!media) return;

    const featuredEvent = events.find(event => event.id === ARABIC_CLASSES_ID);
    const featuredImage = document.getElementById("featured-event-image");
    if (featuredEvent?.coverImage && featuredImage) {
      featuredImage.alt = featuredEvent.coverAlt || "";
      hideUnavailableImage(featuredImage);
      featuredImage.src = featuredEvent.coverImage;
    }

    const heroVideo = document.getElementById("events-hero-video");
    const heroFallback = document.querySelector(".events-hero-fallback");
    if (heroVideo && media.hero?.sources?.length) {
      heroVideo.poster = media.hero.poster;
      if (heroFallback) {
        hideUnavailableImage(heroFallback);
        heroFallback.src = media.hero.fallbackImage;
      }
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      const revealVideo = () => {
        heroVideo.dataset.ready = "true";
        if (heroFallback) heroFallback.hidden = true;
      };
      heroVideo.addEventListener("loadeddata", revealVideo, { once: true });
      heroVideo.addEventListener("error", () => {
        heroVideo.hidden = true;
        if (heroFallback) {
          heroFallback.hidden =
            heroFallback.complete && heroFallback.naturalWidth === 0;
        }
      }, { once: true });
      media.hero.sources.forEach(source => {
        const element = document.createElement("source");
        element.src = source.src;
        element.type = source.type;
        heroVideo.appendChild(element);
      });
      heroVideo.muted = true;
      heroVideo.loop = true;
      heroVideo.playsInline = true;
      heroVideo.controls = true;
      heroVideo.autoplay = !reducedMotion.matches;
      heroVideo.load();
      if (!reducedMotion.matches) {
        heroVideo.play().catch(() => {
          heroVideo.autoplay = false;
        });
      }
      reducedMotion.addEventListener("change", event => {
        if (event.matches) {
          heroVideo.pause();
          heroVideo.autoplay = false;
        }
      });
    }

    const communityVideo = document.getElementById("community-video");
    const communityFallback = document.querySelector(".moments-video-fallback");
    if (communityVideo && media.communityVideo) {
      communityVideo.poster = media.communityVideo.poster;
      if (communityFallback) hideUnavailableImage(communityFallback);
      media.communityVideo.sources.forEach(sourceData => {
        const source = document.createElement("source");
        source.src = sourceData.src;
        source.type = sourceData.type;
        communityVideo.appendChild(source);
      });
      communityVideo.addEventListener("loadeddata", () => {
        if (communityFallback) communityFallback.hidden = true;
      }, { once: true });
      communityVideo.addEventListener("error", () => {
        communityVideo.hidden = true;
        if (communityFallback) {
          communityFallback.hidden =
            communityFallback.complete && communityFallback.naturalWidth === 0;
        }
      }, { once: true });
      communityVideo.load();
    }

    const gallery = document.querySelector(".moments-gallery");
    if (gallery && media.gallery) {
      gallery.replaceChildren();
      media.gallery.forEach(item => {
        const figure = createElement("figure", "moments-photo");
        const image = createElement("img");
        image.alt = item.alt;
        image.loading = "lazy";
        hideUnavailableImage(image);
        image.src = item.src;
        figure.append(image, createElement("figcaption", "", item.caption));
        gallery.appendChild(figure);
      });
    }
  }

  function createEventMedia(event) {
    const figure = createElement("figure", "event-detail-media");
    let videoReady = false;
    const fallback = createElement(
      "div",
      "event-detail-media-fallback",
      event.kind === "placeholder"
        ? "A new opportunity is taking shape"
        : "Event image coming soon"
    );
    fallback.setAttribute("aria-hidden", "true");
    figure.appendChild(fallback);

    let image = null;
    if (event.coverImage) {
      image = createElement("img");
      image.alt = event.coverAlt || "";
      image.loading = "eager";
      image.decoding = "async";
      image.addEventListener("load", () => {
        fallback.hidden = true;
      }, { once: true });
      image.addEventListener("error", () => {
        image.hidden = true;
        fallback.hidden = videoReady;
      }, { once: true });
      image.src = event.coverImage;
      figure.appendChild(image);
    }

    if (event.mediaVideoSources && event.mediaVideoSources.length) {
      const video = createElement("video");
      video.setAttribute("aria-label", `${eventTitle(event, events.indexOf(event))} video`);
      video.controls = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "metadata";
      if (event.mediaPoster) video.poster = event.mediaPoster;
      event.mediaVideoSources.forEach(sourceData => {
        const source = createElement("source");
        source.src = sourceData.src;
        source.type = sourceData.type;
        video.appendChild(source);
      });
      video.addEventListener("loadeddata", () => {
        videoReady = true;
        if (image) image.hidden = true;
        fallback.hidden = true;
      }, { once: true });
      video.addEventListener("error", () => {
        videoReady = false;
        video.hidden = true;
        const hasImage = image && image.complete && image.naturalWidth > 0;
        if (hasImage) image.hidden = false;
        fallback.hidden = Boolean(hasImage);
      }, { once: true });
      figure.appendChild(video);
      video.load();
    }

    if (event.mediaCaption) {
      figure.appendChild(createElement("figcaption", "", event.mediaCaption));
    }
    return figure;
  }

  function createEventIntroduction(event) {
    const section = createElement("div", "event-detail-introduction");
    const introduction = event.introduction;
    if (introduction && event.description) {
      section.appendChild(
        createElement("p", "event-detail-welcome", event.description)
      );
    }
    if (introduction && introduction.greeting) {
      section.appendChild(
        createElement("p", "event-detail-greeting", introduction.greeting)
      );
    }
    (introduction && introduction.paragraphs || [event.summary]).forEach(text => {
      section.appendChild(createElement("p", "", text));
    });
    if (introduction && introduction.callout) {
      section.appendChild(
        createElement("p", "event-detail-callout", introduction.callout)
      );
    }
    return section;
  }

  function createSectionHeading(title, eyebrow) {
    const header = createElement("div", "event-section-heading");
    if (eyebrow) header.appendChild(createElement("p", "eyebrow", eyebrow));
    header.appendChild(createElement("h2", "", title));
    return header;
  }

  function createEventFacts(event) {
    const items = event.details ? event.details.slice() : [];
    if (event.registrationPolicy) {
      items.push(
        ["Who may register", event.registrationPolicy.eligibility],
        ["Registration deadline", event.registrationPolicy.registrationDeadline],
        ["Cancellation and refunds", event.registrationPolicy.cancellationRefundPolicy],
        ["Location details", event.registrationPolicy.locationDetails]
      );
    }
    if (!items.length) return null;
    const section = createElement("section", "event-detail-section event-detail-overview");
    section.id = "event-overview";
    section.appendChild(
      createSectionHeading(
        event.kind === "featured" ? "Course Overview" : "Event Details",
        "At a glance"
      )
    );
    const facts = createElement("dl", "event-facts");
    items.forEach(([term, value]) => {
      const fact = createElement("div", "event-fact");
      fact.append(
        createElement("dt", "", term),
        createElement("dd", "", value)
      );
      facts.appendChild(fact);
    });
    section.appendChild(facts);
    return section;
  }

  function createBenefitsSection(event) {
    if (!event.benefits || !event.benefits.length) return null;
    const section = createElement("section", "event-detail-section event-benefits");
    section.appendChild(
      createSectionHeading("More Than a Language Class", "The experience")
    );
    const grid = createElement("div", "event-benefit-grid");
    event.benefits.forEach((benefit, index) => {
      const item = createElement("article", "event-benefit");
      item.append(
        createElement("span", "event-benefit-number", `0${index + 1}`),
        createElement("h3", "", benefit.title),
        createElement("p", "", benefit.description)
      );
      grid.appendChild(item);
    });
    section.appendChild(grid);
    return section;
  }

  function createProgressionSection(event) {
    if (!event.progression || !event.progression.length) return null;
    const section = createElement("section", "event-detail-section event-progression");
    section.appendChild(
      createSectionHeading("A Foundation for What Comes Next", "Your learning path")
    );
    const list = createElement("ol", "event-progression-list");
    event.progression.forEach(step => {
      const item = createElement("li", "event-progression-step");
      if (step.current) item.classList.add("is-current");
      item.append(
        createElement("h3", "", step.title),
        createElement("p", "", step.description)
      );
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function createAboutSection(event) {
    if (!event.aboutSections || !event.aboutSections.length) return null;
    const section = createElement("section", "event-detail-section event-about");
    section.appendChild(
      createSectionHeading("About This Course", "A closer look")
    );
    const content = createElement("div", "event-about-content");
    content.id = "event-about-content";
    content.setAttribute("role", "region");
    content.setAttribute("aria-label", "Course description");
    event.aboutSections.forEach(group => {
      const subsection = createElement("section", "event-about-subsection");
      subsection.appendChild(createElement("h3", "", group.heading));
      (group.paragraphs || []).forEach(text => {
        subsection.appendChild(createElement("p", "", text));
      });
      if (group.items && group.items.length) {
        const list = createElement("ul", "event-about-list");
        group.items.forEach(text => {
          list.appendChild(createElement("li", "", text));
        });
        subsection.appendChild(list);
      }
      content.appendChild(subsection);
    });
    const toggle = createElement("button", "event-about-toggle", "Read More");
    toggle.type = "button";
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", content.id);
    toggle.addEventListener("click", () => {
      const expanded = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(expanded));
      content.classList.toggle("is-expanded", expanded);
      toggle.textContent = expanded ? "Show Less" : "Read More";
    });
    section.append(content, toggle);
    return section;
  }

  function createNumberedSteps(event) {
    if (!event.enrollmentSteps || !event.enrollmentSteps.length) return null;
    const section = createElement("section", "event-detail-section event-enrollment");
    section.appendChild(
      createSectionHeading("How to Join", "Enrollment")
    );
    const list = createElement("ol", "event-step-list");
    event.enrollmentSteps.forEach(step => {
      const item = createElement("li", "event-step");
      item.append(
        createElement("h3", "", step.title),
        createElement("p", "", step.description)
      );
      list.appendChild(item);
    });
    section.appendChild(list);
    return section;
  }

  function createPaymentSection(event) {
    if (!event.paymentUrl || !event.feeSummary) return null;
    const section = createElement("section", "event-detail-section event-payment");
    section.appendChild(
      createSectionHeading("Course Fees & Payment", "Clear and simple")
    );
    section.appendChild(
      createElement("p", "event-payment-price", event.feeSummary)
    );
    if (event.firstPaymentDue) {
      const due = createElement("p", "event-payment-due");
      due.append(
        document.createTextNode("First payment due: "),
        createElement("strong", "", event.firstPaymentDue)
      );
      section.appendChild(due);
    }
    if (event.paymentPolicy) {
      section.appendChild(createElement("p", "event-payment-policy", event.paymentPolicy));
    }
    section.appendChild(
      createExternalLink(
        "btn btn-outline event-payment-button",
        event.paymentLabel || "Pay Course Fee",
        event.paymentUrl
      )
    );
    if (event.paymentNote) {
      section.appendChild(
        createElement("p", "event-payment-note", event.paymentNote)
      );
    }
    return section;
  }

  function createFaqSection(event) {
    if (!event.faq || !event.faq.length) return null;
    const section = createElement("section", "event-detail-section event-faq");
    section.appendChild(createSectionHeading("Frequently Asked Questions", "Good to know"));
    const list = createElement("div", "event-faq-list");
    event.faq.forEach(item => {
      const details = createElement("details", "event-faq-item");
      details.append(
        createElement("summary", "", item.question),
        createElement("p", "", item.answer)
      );
      list.appendChild(details);
    });
    section.appendChild(list);
    return section;
  }

  function createRegistrationLink(event, className) {
    if (event.registrationUrl) {
      return createExternalLink(
        className,
        event.registrationLabel || "Register Now",
        event.registrationUrl
      );
    }
    if (event.registrationEnabled || event.kind === "placeholder") {
      const link = createElement(
        "a",
        className,
        event.registrationEnabled
          ? "Register for this event"
          : "Get updates about this event"
      );
      link.href = `register.html?event=${encodeURIComponent(event.id)}`;
      return link;
    }
    return null;
  }

  function createDetailActions(event, includeOverviewLink) {
    const actions = createElement("div", "event-detail-actions");
    const registration = createRegistrationLink(event, "btn btn-primary");
    if (registration) actions.appendChild(registration);
    if (includeOverviewLink) {
      const overview = createElement("a", "text-link", "Explore the details");
      overview.href = "#event-overview";
      actions.appendChild(overview);
    }
    return actions;
  }

  function createEventDetail(event, index) {
    const article = createElement("article", "event-detail");
    const hero = createElement("section", "event-detail-hero");
    const copy = createElement("div", "event-detail-hero-copy");
    const statusText = event.kind === "placeholder"
      ? "Coming Soon"
      : event.registrationEnabled
        ? "Registration Open"
        : event.statusLabel;
    copy.append(
      createElement("p", "eyebrow event-detail-category", event.category),
      createElement("p", "event-status", statusText),
      createElement("h1", "", eventTitle(event, index))
    );
    if (event.subtitle) {
      copy.appendChild(createElement("p", "event-detail-subtitle", event.subtitle));
    }
    copy.appendChild(
      createDetailActions(
        event,
        Boolean((event.details && event.details.length) || event.registrationPolicy)
      )
    );
    copy.appendChild(createEventIntroduction(event));
    hero.append(copy, createEventMedia(event));
    article.appendChild(hero);

    const facts = createEventFacts(event);
    const benefits = createBenefitsSection(event);
    const progression = createProgressionSection(event);
    const about = createAboutSection(event);
    const enrollment = createNumberedSteps(event);
    const payment = createPaymentSection(event);
    const faq = createFaqSection(event);
    [facts, benefits, progression, about, enrollment, payment, faq]
      .filter(Boolean)
      .forEach(section => article.appendChild(section));

    if (event.detailsNote && !(event.details && event.details.length)) {
      article.appendChild(
        createElement("p", "event-detail-note", event.detailsNote)
      );
    }
    const footer = createElement("section", "event-detail-footer");
    footer.append(
      createElement(
        "h2",
        "",
        event.kind === "placeholder" ? "Stay in the loop" : "Ready to begin?"
      ),
      createElement(
        "p",
        "",
        event.kind === "placeholder"
          ? "Join the interest list to hear when more information is available."
          : event.footerDescription ||
            "Review the event information and follow the registration instructions."
      )
    );
    const footerActions = createElement("div", "event-detail-actions");
    const footerRegistration = createRegistrationLink(event, "btn btn-primary");
    if (footerRegistration) footerActions.appendChild(footerRegistration);
    const allEvents = createElement("a", "text-link", "Explore All Events");
    allEvents.href = "events.html";
    footerActions.appendChild(allEvents);
    footer.appendChild(footerActions);
    article.appendChild(footer);

    document.title = `${eventTitle(event, index)} | Banāt al-Ummah`;
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) metaDescription.content = event.summary;
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

    container.replaceChildren(createEventDetail(event, events.indexOf(event)));
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
    if (event.id === ARABIC_CLASSES_ID) {
      card.append(
        createElement("p", "eyebrow", "Registration Open"),
        createElement("h1", "", eventTitle(event, index)),
        createElement(
          "p",
          "",
          "Register through the course form. Registration is subject to confirmation and availability."
        ),
        createExternalLink(
          "btn btn-primary",
          event.registrationLabel || "Register for Arabic Classes",
          event.registrationUrl
        )
      );
      const back = createElement("a", "text-link", "Return to event details");
      back.href = `event.html?event=${encodeURIComponent(event.id)}`;
      card.append(back);
      container.appendChild(card);
      return;
    }

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
    initializeEventsPageMedia();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeEvents);
  } else {
    initializeEvents();
  }
})();
