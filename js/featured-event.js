"use strict";

(() => {
  const section = document.querySelector("[data-featured-event]");
  const events = window.BANAT_EVENTS;

  if (!section) {
    console.error("The featured event strip could not be found.");
    return;
  }

  if (!Array.isArray(events)) {
    console.error("Featured event data could not be loaded.");
    return;
  }

  const event = events.find(item => item.kind === "featured");
  if (!event || !event.id || !event.title) {
    console.error("No valid featured event is available.");
    return;
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  }

  function createCalendarIcon() {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("class", "featured-event-calendar");
    icon.setAttribute("viewBox", "0 0 32 32");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");

    const frame = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    frame.setAttribute("x", "4.5");
    frame.setAttribute("y", "7");
    frame.setAttribute("width", "23");
    frame.setAttribute("height", "20");
    frame.setAttribute("rx", "2");
    frame.setAttribute("stroke", "currentColor");
    frame.setAttribute("stroke-width", "1.6");

    const header = document.createElementNS("http://www.w3.org/2000/svg", "path");
    header.setAttribute("d", "M4.5 12h23M10 4.5v5M22 4.5v5M10 16.5h.01M16 16.5h.01M22 16.5h.01M10 21h.01M16 21h.01");
    header.setAttribute("stroke", "currentColor");
    header.setAttribute("stroke-width", "1.6");
    header.setAttribute("stroke-linecap", "round");

    icon.append(frame, header);
    return icon;
  }

  const currentLevel = Array.isArray(event.progression)
    ? event.progression.find(level => level.current)
    : null;
  const subtitle = currentLevel && currentLevel.title
    ? currentLevel.title.replace(/\s*\|\s*/, " · ")
    : event.subtitle;
  const status = currentLevel && currentLevel.description
    ? currentLevel.description
    : event.statusLabel;

  const layout = section.querySelector(".featured-event-inner");
  const identity = createElement("div", "featured-event-identity");
  const labelGroup = createElement("div", "featured-event-label-group");
  const label = createElement("p", "featured-event-label", "FEATURED EVENT");
  const underline = createElement("span", "featured-event-underline");
  underline.setAttribute("aria-hidden", "true");
  labelGroup.append(label, underline);
  identity.append(labelGroup, createCalendarIcon());

  const divider = createElement("span", "featured-event-divider");
  divider.setAttribute("aria-hidden", "true");

  const copy = createElement("div", "featured-event-copy");
  const heading = createElement("h2", "featured-event-title", event.title);
  heading.id = "featured-event-title";
  copy.appendChild(heading);

  const details = createElement("div", "featured-event-details");
  if (subtitle) details.appendChild(createElement("p", "featured-event-subtitle", subtitle));
  if (status) details.appendChild(createElement("span", "featured-event-badge", status));
  copy.appendChild(details);

  const actions = createElement("div", "featured-event-actions");
  const exploreLink = createElement("a", "featured-event-button featured-event-button-primary");
  exploreLink.href = `event.html?event=${encodeURIComponent(event.id)}`;
  exploreLink.append(
    document.createTextNode("Explore Class "),
    createElement("span", "", "→")
  );
  exploreLink.lastElementChild.setAttribute("aria-hidden", "true");

  const allEventsLink = createElement("a", "featured-event-button featured-event-button-secondary", "View All Events");
  allEventsLink.href = "events.html";
  actions.append(exploreLink, allEventsLink);

  layout.append(identity, divider, copy, actions);
  section.setAttribute("aria-labelledby", heading.id);
  section.hidden = false;
})();
