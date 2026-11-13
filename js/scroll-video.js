"use strict";

(() => {
  if (!("IntersectionObserver" in window)) {
    console.warn("Scroll-triggered video playback is not supported in this browser.");
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const visibility = new WeakMap();
  const observedVideos = new WeakSet();

  function playVideo(video) {
    if (
      reducedMotion.matches ||
      !visibility.get(video) ||
      (!video.hasAttribute("src") && !video.querySelector("source"))
    ) {
      return;
    }

    video.muted = true;
    video.playsInline = true;
    video.play().catch(error => {
      if (error.name !== "NotAllowedError" && error.name !== "AbortError") {
        console.warn("A video could not start automatically.", error);
      }
    });
  }

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const video = entry.target;
      const isVisible = entry.isIntersecting;
      visibility.set(video, isVisible);

      if (isVisible) {
        playVideo(video);
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.2 });

  function observeVideo(video) {
    if (observedVideos.has(video)) return;
    observedVideos.add(video);
    observer.observe(video);
  }

  document.querySelectorAll("video").forEach(observeVideo);

  const addedVideos = new MutationObserver(records => {
    records.forEach(record => {
      if (record.type === "attributes" && record.target instanceof HTMLVideoElement) {
        playVideo(record.target);
        return;
      }

      if (record.target instanceof HTMLVideoElement) {
        playVideo(record.target);
      }

      record.addedNodes.forEach(node => {
        if (!(node instanceof Element)) return;
        if (node instanceof HTMLVideoElement) observeVideo(node);
        node.querySelectorAll("video").forEach(observeVideo);
      });
    });
  });

  addedVideos.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["src"]
  });

  reducedMotion.addEventListener("change", event => {
    if (event.matches) {
      document.querySelectorAll("video").forEach(video => video.pause());
      return;
    }

    document.querySelectorAll("video").forEach(playVideo);
  });
})();
