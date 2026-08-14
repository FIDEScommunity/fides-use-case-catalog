/**
 * Count-up animation for the Use Case Discovery shortcode.
 * Matches the timing and easing used by FIDES Community Tools Tiles.
 */
(function () {
  "use strict";

  const duration = 4500;

  function easeOutQuart(progress) {
    return 1 - Math.pow(1 - progress, 4);
  }

  function prefersReducedMotion() {
    return (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function animateValue(element, target) {
    let startTime = null;
    element.textContent = "0";

    function step(timestamp) {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      element.textContent = String(Math.round(target * easeOutQuart(progress)));
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
    container.querySelectorAll(".fides-ct-count[data-count]").forEach((element) => {
      const target = Number.parseInt(element.getAttribute("data-count"), 10);
      if (!Number.isFinite(target) || target < 0) return;
      if (reducedMotion) {
        element.textContent = String(target);
      } else {
        animateValue(element, target);
      }
    });
  }

  function init() {
    const containers = document.querySelectorAll(".fides-uc-discovery");
    if (!containers.length) return;

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
