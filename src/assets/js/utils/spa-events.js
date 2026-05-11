/**
 * spa-events.js — SPA-safe event listener utility
 *
 * Problem: In SPA apps, scripts may be executed multiple times (initial HTML load
 * + dynamic injection by SPA router). Each execution registers new event listeners
 * on document/window for "spa:load" / "spa:ready" events, causing handlers to fire
 * multiple times per navigation.
 *
 * Solution: AbortController-based deduplication. Each re-registration aborts the
 * previous signal, removing the old listener before adding the new one.
 *
 * Usage (inside an IIFE):
 *   var _spaListeners = new Map();
 *
 *   // Instead of: document.addEventListener("spa:load", handler)
 *   window.__onSpaEvent(document, "spa:load", handler, _spaListeners);
 */
(function (global) {
  "use strict";

  /**
   * Register a SPA event listener with automatic deduplication.
   * If a listener for the same (target, event) pair already exists, it is
   * removed via AbortController.abort() before the new one is added.
   *
   * @param {EventTarget} target  - e.g. document or window
   * @param {string} event        - e.g. "spa:load" or "spa:ready"
   * @param {Function} handler    - the event handler function
   * @param {Map} registry        - module-level Map for tracking listeners
   */
  function onSpaEvent(target, event, handler, registry) {
    var key = target.toString() + "::" + event;
    if (registry.has(key)) {
      registry.get(key).abort();
    }
    var ctrl = new AbortController();
    target.addEventListener(event, handler, { signal: ctrl.signal });
    registry.set(key, ctrl);
  }

  global.__onSpaEvent = onSpaEvent;

  // Global _spaOn — shared AbortController registry for SPA-safe event binding
  // Used by multiple modules that previously defined this function locally.
  var _spaRegs = {};

  /**
   * Register an event listener with automatic deduplication by key.
   * @param {EventTarget} tgt   - target element (document, window, etc.)
   * @param {string} evt        - event name
   * @param {Function} fn       - handler
   * @param {string} key        - unique key for deduplication
   */
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  global._spaOn = _spaOn;
})(window);
