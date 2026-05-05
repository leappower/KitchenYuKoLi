(function (global) {
  "use strict";

  function safeCall(fnName, args) {
    if (typeof global[fnName] === "function") {
      return global[fnName].apply(null, args || []);
    }
    console.warn("[PageInteractions] " + fnName + " not found — make sure contacts.js / smart-popup.js is loaded.");
  }

  function directText(el) {
    var text = "";
    el.childNodes.forEach(function (node) {
      if (node.nodeType === 3 /* TEXT_NODE */) {
        text += node.nodeValue;
      }
    });
    return text.trim();
  }

  function findByText(tag, text) {
    var els = document.querySelectorAll(tag);
    var results = [];
    var lower = text.toLowerCase();
    els.forEach(function (el) {
      if (directText(el).toLowerCase().indexOf(lower) !== -1) {
        results.push(el);
      }
    });
    return results;
  }

  window.PiHelpers = { safeCall: safeCall, directText: directText, findByText: findByText };
})(window);
