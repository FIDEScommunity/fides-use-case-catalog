/**
 * Count-up animation for the Use Case Discovery shortcode and the homepage theme index.
 * Matches the timing and easing used by FIDES Community Tools Tiles.
 * Also wires Matomo events from data-matomo-* attributes on links.
 */
(function () {
  "use strict";

  const duration = 4500;

  function easeOutQuart(progress) {
    return 1 - Math.pow(1 - progress, 4);
  }

  // Gentle slow-down for the homepage index (about 3 s): the last values do not crawl,
  // so the visible count ends close to the end of the run.
  function easeOutQuad(progress) {
    return 1 - (1 - progress) * (1 - progress);
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function trackMatomoEvent(category, action, name) {
    if (typeof window._paq === "undefined") return;
    if (navigator.doNotTrack === "1" || navigator.doNotTrack === "yes") return;
    try {
      if (name) {
        window._paq.push(["trackEvent", category, action, name]);
      } else {
        window._paq.push(["trackEvent", category, action]);
      }
    } catch (_err) {
      /* analytics must never break the page */
    }
  }

  function bindMatomoClicks(container) {
    container.addEventListener("click", (event) => {
      const link = event.target.closest("a[data-matomo-category][data-matomo-action]");
      if (!link || !container.contains(link)) return;
      trackMatomoEvent(
        link.getAttribute("data-matomo-category"),
        link.getAttribute("data-matomo-action"),
        link.getAttribute("data-matomo-name") || undefined
      );
    });
  }

  function animateValue(element, target, length, easing) {
    let startTime = null;
    element.textContent = "0";

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / length, 1);
      element.textContent = String(Math.round(target * easing(progress)));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = String(target);
      }
    }

    window.requestAnimationFrame(step);
  }

  function run(container) {
    const reducedMotion = prefersReducedMotion();
    // The homepage index counts up briefly (data-count-duration); the discovery cards keep the long default.
    const requested = Number.parseInt(container.getAttribute("data-count-duration"), 10);
    const custom = Number.isFinite(requested) && requested > 0;
    const length = custom ? requested : duration;
    const easing = custom ? easeOutQuad : easeOutQuart;
    container.querySelectorAll(".fides-ct-count[data-count]").forEach((element) => {
      const target = Number.parseInt(element.getAttribute("data-count"), 10);
      if (!Number.isFinite(target) || target < 0) return;
      if (reducedMotion) {
        element.textContent = String(target);
      } else {
        animateValue(element, target, length, easing);
      }
    });
  }

  function init() {
    const containers = document.querySelectorAll(".fides-uc-discovery, .fides-uc-index");
    if (!containers.length) return;

    containers.forEach(bindMatomoClicks);

    if (typeof window.IntersectionObserver !== "function") {
      containers.forEach(run);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px", threshold: 0.1 },
    );
    containers.forEach((container) => observer.observe(container));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
