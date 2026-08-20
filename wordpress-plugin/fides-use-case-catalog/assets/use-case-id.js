/**
 * Shared public use-case id helper (browser + Node). Ids are case-sensitive.
 */
(function (root) {
  "use strict";

  var PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

  function isValidId(id) {
    id = String(id || "").trim();
    return id !== "" && PATTERN.test(id);
  }

  var api = {
    PATTERN: PATTERN,
    isValidId: isValidId
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  root.FidesUseCaseId = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
