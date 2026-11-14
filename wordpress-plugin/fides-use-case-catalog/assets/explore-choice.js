/*
 * Explore by theme / sector: progressive enhancement only.
 * The server renders the choices as links (?theme=… / ?sector=…) and the chosen overview. This script swaps the
 * result region and the chosen marker without a page load, keeps the address in sync (pushState / popstate)
 * and moves focus to the heading of the new overview. Without it, every choice is a normal link.
 */
(function () {
  "use strict";

  var root = document.querySelector("[data-fides-explore]");
  if (!root || !window.fetch || !window.history || !window.DOMParser) return;

  var param = root.getAttribute("data-param") || "theme";
  var cache = {};
  var token = 0;

  function slugOf(url) {
    try {
      return new URL(url, window.location.href).searchParams.get(param) || "";
    } catch (e) {
      return "";
    }
  }

  function live() {
    var node = document.getElementById("fides-explore-live");
    if (!node) {
      node = document.createElement("p");
      node.id = "fides-explore-live";
      node.className = "fides-ds-visually-hidden";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      root.appendChild(node);
    }
    return node;
  }

  function load(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    return fetch(url, { credentials: "same-origin", headers: { Accept: "text/html" } })
      .then(function (response) {
        if (!response.ok) throw new Error("status " + response.status);
        return response.text();
      })
      .then(function (text) {
        var doc = new DOMParser().parseFromString(text, "text/html");
        var next = doc.querySelector("[data-fides-explore]");
        if (!next) throw new Error("no explore root");
        cache[url] = { root: next, title: doc.title };
        return cache[url];
      });
  }

  function apply(data, focus) {
    var next = data.root;
    var result = root.querySelector("[data-fides-explore-result]");
    var nextResult = next.querySelector("[data-fides-explore-result]");
    var head = root.querySelector("[data-fides-explore-head]");
    var nextHead = next.querySelector("[data-fides-explore-head]");
    if (!result || !nextResult || !head || !nextHead) return false;
    result.innerHTML = nextResult.innerHTML;
    // The header holds the heading (the chosen name), the "Change" action, the notice and the choices: take it as a whole.
    head.innerHTML = nextHead.innerHTML;
    root.setAttribute("data-selected", next.getAttribute("data-selected") || "");
    if (data.title) document.title = data.title;
    // The "On this page" bar of the new result needs its tabs / folded state and current-section marking.
    if (window.FidesDS && window.FidesDS.initSectionNavs) window.FidesDS.initSectionNavs(result);
    var state = result.querySelector("[data-fides-explore-title]");
    var heading = head.querySelector(".fides-explore__title");
    var newNotice = head.querySelector("[data-fides-explore-notice]");
    var message = "";
    if (state) {
      message = heading.textContent + " selected";
    } else if (newNotice) {
      message = newNotice.textContent;
    } else {
      message = "No selection";
    }
    live().textContent = message;
    setExpanded(false);
    if (focus && heading) heading.focus({ preventScroll: false });
    return true;
  }

  // Phones: after a choice the list is folded away; "Change sector / theme" (or "Choose another …") opens it.
  function setExpanded(open) {
    Array.prototype.forEach.call(root.querySelectorAll("[data-fides-explore-change]"), function (link) {
      link.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  function toggleChoices(link) {
    var choices = root.querySelector("[data-fides-explore-choices]");
    if (!choices) return;
    // The bar action closes an open list again; "Choose another …" at the end of the page only opens it.
    if (choices.classList.contains("is-open") && link.classList.contains("fides-explore__change")) {
      choices.classList.remove("is-open");
      setExpanded(false);
      return;
    }
    openChoices();
  }

  function openChoices() {
    var choices = root.querySelector("[data-fides-explore-choices]");
    if (!choices) return;
    choices.classList.add("is-open");
    setExpanded(true);
    var target = choices.querySelector(".fides-explore__choice[aria-current]") || choices.querySelector(".fides-explore__choice");
    if (target) target.focus();
  }

  function go(url, push) {
    var mine = ++token;
    load(url)
      .then(function (data) {
        if (mine !== token) return;
        if (!apply(data, true)) {
          window.location.assign(url);
          return;
        }
        if (push) window.history.pushState({ fidesExplore: slugOf(url) }, "", url);
      })
      .catch(function () {
        if (mine === token) window.location.assign(url);
      });
  }

  root.addEventListener("click", function (event) {
    var change = event.target.closest && event.target.closest("a[data-fides-explore-change]");
    if (change && !event.defaultPrevented && event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      toggleChoices(change);
      return;
    }
    var link = event.target.closest && event.target.closest("a.fides-explore__choice");
    if (!link || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (slugOf(link.href) === (root.getAttribute("data-selected") || "") && slugOf(link.href) !== "") {
      var current = root.querySelector(".fides-explore__title");
      if (current) current.focus();
      return;
    }
    go(link.href, true);
  });

  // Space activates a choice like a button (links only react to Enter by default).
  root.addEventListener("keydown", function (event) {
    var link = event.target.closest && event.target.closest("a.fides-explore__choice");
    if (link && (event.key === " " || event.key === "Spacebar") && !event.metaKey && !event.ctrlKey && !event.altKey) {
      event.preventDefault();
      link.click();
    }
  });

  setExpanded(false);
  window.history.replaceState({ fidesExplore: root.getAttribute("data-selected") || "" }, "", window.location.href);
  window.addEventListener("popstate", function () {
    go(window.location.href, false);
  });
})();
