"use strict";

(() => {
  const data = window.BANAT_STORIES;
  const cohortList = document.getElementById("cohort-list");
  const photoStrip = document.getElementById("album-strip-photos");
  const reflectionList = document.getElementById("reflection-carousel");
  const reflectionEmpty = document.getElementById("reflections-empty");
  const reflectionControls = document.getElementById("reflection-controls");
  const reflectionCount = document.getElementById("reflection-count");

  if (!data || !cohortList || !photoStrip) {
    console.error("Sponsored group content could not be initialized.");
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const panelAnimations = new WeakMap();
  let openCohort = null;
  let openMemberProfile = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function createGroupIcon() {
    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("aria-hidden", "true");

    const people = document.createElementNS("http://www.w3.org/2000/svg", "path");
    people.setAttribute("d", "M9 11a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Zm7-1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM2.8 19.5c.35-3.5 2.55-5.3 6.2-5.3s5.85 1.8 6.2 5.3H2.8Zm12-4.4c3.5-.7 5.85.8 6.4 4.4h-4.3");
    people.setAttribute("stroke", "currentColor");
    people.setAttribute("stroke-width", "1.5");
    people.setAttribute("stroke-linecap", "round");
    people.setAttribute("stroke-linejoin", "round");
    icon.appendChild(people);
    return icon;
  }

  function animatePanel(panel, open) {
    const previousAnimation = panelAnimations.get(panel);
    if (previousAnimation) previousAnimation.cancel();

    if (reducedMotion.matches || typeof panel.animate !== "function") {
      panel.hidden = !open;
      panel.inert = !open;
      return;
    }

    if (open) {
      panel.hidden = false;
      panel.inert = false;
      panel.style.overflow = "hidden";
      const animation = panel.animate(
        [{ height: "0px", opacity: 0 }, { height: `${panel.scrollHeight}px`, opacity: 1 }],
        { duration: 180, easing: "ease-out" }
      );
      panelAnimations.set(panel, animation);
      animation.onfinish = () => {
        panel.style.overflow = "";
        panelAnimations.delete(panel);
      };
      return;
    }

    panel.inert = true;
    const height = panel.getBoundingClientRect().height;
    const animation = panel.animate(
      [{ height: `${height}px`, opacity: 1 }, { height: "0px", opacity: 0 }],
      { duration: 160, easing: "ease-in" }
    );
    panelAnimations.set(panel, animation);
    animation.onfinish = () => {
      panel.hidden = true;
      panel.style.overflow = "";
      panelAnimations.delete(panel);
    };
  }

  function appendCohortDetails(panel, cohort) {
    const inner = element("div", "cohort-panel-inner");
    const groupPhoto = element("figure", "cohort-group-photo");
    const image = element("img");
    image.src = cohort.groupPhoto.src;
    image.alt = cohort.groupPhoto.alt;
    image.loading = "lazy";
    image.decoding = "async";
    groupPhoto.appendChild(image);

    const overview = element("div", "cohort-overview");
    overview.appendChild(element("h3", "", cohort.overviewTitle || "Group Overview"));
    overview.appendChild(element("p", "cohort-description", cohort.overview));

    const detailList = element("ul", "cohort-facts");
    cohort.details.forEach(detail => {
      const item = element("li");
      const icon = element("span", "cohort-fact-icon", detail.icon);
      icon.setAttribute("aria-hidden", "true");
      const text = element("span", "cohort-fact-copy");
      text.append(element("strong", "", detail.label), element("span", "", detail.value));
      item.append(icon, text);
      detailList.appendChild(item);
    });
    overview.appendChild(detailList);

    const members = element("div", "cohort-members");
    members.appendChild(element("h3", "", "Group Members"));
    const memberGrid = element("div", "member-grid");
    cohort.members.forEach((member, index) => {
      const profileId = `${cohort.id}-member-${index + 1}-profile`;
      const card = element("div", "member-card");
      const trigger = element("button", "member-trigger");
      trigger.type = "button";
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-controls", profileId);

      if (member.image) {
        const portrait = element("img", "member-portrait");
        portrait.src = member.image;
        portrait.alt = member.alt || "";
        portrait.loading = "lazy";
        portrait.decoding = "async";
        trigger.appendChild(portrait);
      } else {
        const initials = element("span", "member-portrait member-initials", member.initials);
        initials.setAttribute("aria-hidden", "true");
        trigger.appendChild(initials);
      }

      trigger.appendChild(element("span", "member-name", member.name));
      const profile = element("div", "member-profile", member.biography);
      profile.id = profileId;
      profile.hidden = true;
      const closeProfile = element("button", "member-profile-close", "Close profile");
      closeProfile.type = "button";
      closeProfile.addEventListener("click", () => {
        profile.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        openMemberProfile = null;
        trigger.focus();
      });

      trigger.addEventListener("click", () => {
        if (openMemberProfile && openMemberProfile !== trigger) {
          openMemberProfile.setAttribute("aria-expanded", "false");
          document.getElementById(openMemberProfile.getAttribute("aria-controls")).hidden = true;
        }

        const expanded = trigger.getAttribute("aria-expanded") === "true";
        profile.hidden = expanded;
        trigger.setAttribute("aria-expanded", String(!expanded));
        openMemberProfile = expanded ? null : trigger;
      });

      profile.appendChild(closeProfile);
      card.append(trigger, profile);
      memberGrid.appendChild(card);
    });
    members.appendChild(memberGrid);

    const albumLink = element("a", "cohort-album-link");
    albumLink.href = `album.html?cohort=${encodeURIComponent(cohort.id)}`;
    albumLink.append(
      document.createTextNode("View Group Album "),
      element("span", "", "→")
    );
    albumLink.lastElementChild.setAttribute("aria-hidden", "true");
    members.appendChild(albumLink);

    inner.append(groupPhoto, overview, members);
    panel.appendChild(inner);
  }

  function renderCohorts() {
    data.cohorts.forEach((cohort, index) => {
      const item = element("article", `cohort-item${index === 0 ? " cohort-primary" : ""}`);
      const panelId = `${cohort.id}-panel`;
      const trigger = element("button", "cohort-toggle");
      trigger.type = "button";
      trigger.id = `${cohort.id}-toggle`;
      trigger.setAttribute("aria-expanded", "false");
      trigger.setAttribute("aria-controls", panelId);

      const groupIcon = element("span", "cohort-group-icon");
      groupIcon.setAttribute("aria-hidden", "true");
      groupIcon.appendChild(createGroupIcon());
      const titleWrap = element("span", "cohort-title-wrap");
      titleWrap.append(
        element("span", "cohort-title", cohort.title),
        element("span", "cohort-status", cohort.status)
      );
      const chevron = element("span", "cohort-chevron", "⌄");
      chevron.setAttribute("aria-hidden", "true");
      trigger.append(groupIcon, titleWrap, chevron);

      const panel = element("div", "cohort-panel");
      panel.id = panelId;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", trigger.id);
      panel.hidden = true;
      panel.inert = true;
      if (cohort.members) {
        appendCohortDetails(panel, cohort);
      } else {
        panel.appendChild(
          element("p", "future-cohort-message", cohort.message)
        );
      }

      trigger.addEventListener("click", () => {
        const isOpen = trigger.getAttribute("aria-expanded") === "true";
        if (openCohort && openCohort !== trigger) {
          const previousPanel = document.getElementById(openCohort.getAttribute("aria-controls"));
          openCohort.setAttribute("aria-expanded", "false");
          animatePanel(previousPanel, false);
        }

        trigger.setAttribute("aria-expanded", String(!isOpen));
        animatePanel(panel, !isOpen);
        openCohort = isOpen ? null : trigger;
        if (openMemberProfile) {
          openMemberProfile.setAttribute("aria-expanded", "false");
          const profile = document.getElementById(openMemberProfile.getAttribute("aria-controls"));
          if (profile) profile.hidden = true;
          openMemberProfile = null;
        }
      });

      item.append(trigger, panel);
      cohortList.appendChild(item);
    });
  }

  function renderPhotoStrip() {
    data.photos.slice(0, 5).forEach(photo => {
      const link = element("a", "album-strip-photo");
      link.href = `album.html?cohort=${encodeURIComponent(photo.cohort || "")}`;
      link.setAttribute("aria-label", `Open album: ${photo.alt}`);
      const image = element("img");
      image.src = photo.src;
      image.alt = photo.alt;
      image.loading = "lazy";
      image.decoding = "async";
      link.appendChild(image);
      photoStrip.appendChild(link);
    });
  }

  function renderReflections() {
    if (!reflectionList || !reflectionEmpty) return;
    const reflections = Array.isArray(data.reflections) ? data.reflections : [];
    if (reflections.length === 0) {
      reflectionEmpty.hidden = false;
      return;
    }

    const mobileLayout = window.matchMedia("(max-width: 700px)");
    let currentPage = 0;
    const controls = document.querySelectorAll("[data-reflection-step]");

    function showPage() {
      const pageSize = mobileLayout.matches ? 1 : 3;
      const pages = Math.ceil(reflections.length / pageSize);
      currentPage = Math.min(currentPage, pages - 1);
      reflectionList.replaceChildren();
      reflections.slice(currentPage * pageSize, (currentPage + 1) * pageSize).forEach(reflection => {
        const card = element("blockquote", "reflection-card");
        card.appendChild(element("span", "reflection-quote-mark", "“"));
        card.appendChild(element("p", "reflection-quote", reflection.quote));
        card.appendChild(element("cite", "reflection-attribution", reflection.attribution));
        reflectionList.appendChild(card);
      });
      if (reflectionCount) reflectionCount.textContent = `${currentPage + 1} / ${pages}`;
      if (reflectionControls) reflectionControls.hidden = pages < 2;
    }

    reflectionEmpty.hidden = true;
    showPage();
    mobileLayout.addEventListener("change", () => {
      currentPage = 0;
      showPage();
    });
    controls.forEach(button => {
      button.addEventListener("click", () => {
        const pageSize = mobileLayout.matches ? 1 : 3;
        const pages = Math.ceil(reflections.length / pageSize);
        currentPage = (currentPage + Number(button.dataset.reflectionStep) + pages) % pages;
        showPage();
      });
    });
  }

  renderCohorts();
  renderPhotoStrip();
  renderReflections();
})();
