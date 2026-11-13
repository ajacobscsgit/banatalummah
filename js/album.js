"use strict";

(() => {
  const data = window.BANAT_STORIES;
  const gallery = document.getElementById("album-gallery");
  const filters = document.getElementById("album-filters");
  const emptyState = document.getElementById("album-empty");
  const cohortFilter = document.getElementById("album-cohort-filter");
  const cohortSelect = document.getElementById("album-cohort-select");
  const lightbox = document.getElementById("album-lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxCount = document.getElementById("lightbox-count");

  if (!data || !gallery || !filters || !lightbox) {
    console.error("The journey album could not be initialized.");
    return;
  }

  const allPhotos = Array.isArray(data.photos) ? data.photos : [];
  const urlParams = new URLSearchParams(window.location.search);
  const initialCohort = urlParams.get("cohort") || "all";
  const cohorts = Array.from(new Set(allPhotos.map(photo => photo.cohort).filter(Boolean)));
  const categories = Array.from(new Set(allPhotos.map(photo => photo.category).filter(Boolean)));
  let activeCategory = "all";
  let visiblePhotos = [];
  let activePhotoIndex = 0;
  let lastPhotoTrigger = null;
  let touchStartX = null;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function selectedCohort() {
    return cohortSelect && !cohortFilter.hidden
      ? cohortSelect.value
      : initialCohort;
  }

  function filteredPhotos() {
    const cohort = selectedCohort();
    return allPhotos.filter(photo =>
      (cohort === "all" || photo.cohort === cohort) &&
      (activeCategory === "all" || photo.category === activeCategory)
    );
  }

  function updateLightbox() {
    const photo = visiblePhotos[activePhotoIndex];
    if (!photo) return;

    lightboxImage.src = photo.src;
    lightboxImage.alt = photo.alt;
    if (photo.caption) {
      lightboxCaption.textContent = photo.caption;
      lightboxCaption.hidden = false;
    } else {
      lightboxCaption.textContent = "";
      lightboxCaption.hidden = true;
    }
    lightboxCount.textContent = `${activePhotoIndex + 1} of ${visiblePhotos.length}`;
  }

  function renderGallery() {
    visiblePhotos = filteredPhotos();
    gallery.replaceChildren();
    emptyState.hidden = visiblePhotos.length > 0;

    visiblePhotos.forEach((photo, index) => {
      const button = element("button", "album-photo-button");
      button.type = "button";
      button.setAttribute("aria-label", `Open photo ${index + 1}: ${photo.alt}`);
      const image = element("img", "album-photo");
      image.src = photo.src;
      image.alt = photo.alt;
      image.loading = "lazy";
      image.decoding = "async";
      button.appendChild(image);
      button.addEventListener("click", () => {
        lastPhotoTrigger = button;
        activePhotoIndex = index;
        updateLightbox();
        lightbox.showModal();
      });
      gallery.appendChild(button);
    });
  }

  function renderFilters() {
    const options = [{ label: "All Photos", value: "all" }]
      .concat(categories.map(category => ({ label: category, value: category })));

    options.forEach(option => {
      const button = element("button", "album-filter", option.label);
      button.type = "button";
      button.dataset.category = option.value;
      button.setAttribute("aria-pressed", String(option.value === activeCategory));
      button.addEventListener("click", () => {
        activeCategory = option.value;
        filters.querySelectorAll(".album-filter").forEach(filter => {
          filter.setAttribute("aria-pressed", String(filter === button));
        });
        renderGallery();
      });
      filters.appendChild(button);
    });
  }

  function renderCohortFilter() {
    if (!cohortSelect || cohorts.length < 2) return;

    cohortFilter.hidden = false;
    cohortSelect.appendChild(new Option("All Cohorts", "all"));
    cohorts.forEach(cohort => {
      const group = data.cohorts.find(item => item.id === cohort);
      cohortSelect.appendChild(new Option(group ? group.title : cohort, cohort));
    });
    cohortSelect.value = cohorts.includes(initialCohort) ? initialCohort : "all";
    cohortSelect.addEventListener("change", renderGallery);
  }

  document.querySelectorAll("[data-lightbox-close]").forEach(button => {
    button.addEventListener("click", () => lightbox.close());
  });

  document.querySelectorAll("[data-lightbox-step]").forEach(button => {
    button.addEventListener("click", () => {
      activePhotoIndex = (
        activePhotoIndex + Number(button.dataset.lightboxStep) + visiblePhotos.length
      ) % visiblePhotos.length;
      updateLightbox();
    });
  });

  lightbox.addEventListener("click", event => {
    if (event.target === lightbox) lightbox.close();
  });

  lightbox.addEventListener("close", () => {
    if (lastPhotoTrigger) lastPhotoTrigger.focus();
  });

  lightbox.addEventListener("pointerdown", event => {
    if (event.pointerType === "touch") touchStartX = event.clientX;
  });

  lightbox.addEventListener("pointerup", event => {
    if (touchStartX === null) return;
    const distance = event.clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(distance) < 45 || visiblePhotos.length < 2) return;
    activePhotoIndex = (
      activePhotoIndex + (distance < 0 ? 1 : -1) + visiblePhotos.length
    ) % visiblePhotos.length;
    updateLightbox();
  });

  document.addEventListener("keydown", event => {
    if (!lightbox.open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      lightbox.close();
    } else if (event.key === "ArrowRight") {
      activePhotoIndex = (activePhotoIndex + 1) % visiblePhotos.length;
      updateLightbox();
    } else if (event.key === "ArrowLeft") {
      activePhotoIndex = (activePhotoIndex - 1 + visiblePhotos.length) % visiblePhotos.length;
      updateLightbox();
    }
  });

  renderFilters();
  renderCohortFilter();
  renderGallery();
})();
