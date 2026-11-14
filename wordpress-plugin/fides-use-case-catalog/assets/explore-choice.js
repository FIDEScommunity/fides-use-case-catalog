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
    if (!result || !nextResult) return false;
    result.innerHTML = nextResult.innerHTML;
    // Choices: copy the chosen marker (aria-current, check mark and hidden text) from the server markup.
    var list = root.querySelector("[data-fides-explore-choices] ul");
    var nextList = next.querySelector("[data-fides-explore-choices] ul");
    if (list && nextList) list.innerHTML = nextList.innerHTML;
    // Notice for an unknown slug lives in the header.
    var oldNotice = root.querySelector("[data-fides-explore-notice]");
    var newNotice = next.querySelector("[data-fides-explore-notice]");
    if (oldNotice) oldNotice.remove();
    if (newNotice) {
      var head = root.querySelector(".fides-explore__head");
      var choices = root.querySelector("[data-fides-explore-choices]");
      if (head && choices) head.insertBefore(document.importNode(newNotice, true), choices);
    }
    root.setAttribute("data-selected", next.getAttribute("data-selected") || "");
    if (data.title) document.title = data.title;
    var state = result.querySelector("[data-fides-explore-title]");
    var message = "";
    if (state) {
      message = state.querySelector(".fides-explore__selected-title").textContent + " selected";
    } else if (newNotice) {
      message = newNotice.textContent;
    } else {
      message = "No selection";
    }
    live().textContent = message;
    if (focus) {
      var heading = result.querySelector(".fides-explore__selected-title, .fides-explore__start-title");
      if (heading) heading.focus({ preventScroll: false });
    }
    return true;
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
    var link = event.target.closest && event.target.closest("a.fides-explore__choice");
    if (!link || event.defaultPrevented) return;
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (slugOf(link.href) === (root.getAttribute("data-selected") || "") && slugOf(link.href) !== "") {
      var current = root.querySelector(".fides-explore__selected-title");
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

  window.history.replaceState({ fidesExplore: root.getAttribute("data-selected") || "" }, "", window.location.href);
  window.addEventListener("popstate", function () {
    go(window.location.href, false);
  });
})();
