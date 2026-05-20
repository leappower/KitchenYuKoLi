/**
 * search-engine.js — Client-side search engine
 *
 * Loads a pre-built search index (search-index.json) generated during SSG build.
 * Provides fuzzy substring matching across page titles, descriptions, headings,
 * and category keywords.
 *
 * Usage:
 *   SearchEngine.search("wok") → [{ path, title, snippet, score }]
 */

(function (global) {
  "use strict";

  var INDEX_URL = "/assets/data/search-index.json";
  var index = null;
  var indexPromise = null;

  // ─── Normalisation ─────────────────────────────────────────────

  function normalize(str) {
    return String(str)
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af\s-]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // ─── Index Loading ─────────────────────────────────────────────

  function loadIndex() {
    if (index) return Promise.resolve(index);
    if (indexPromise) return indexPromise;

    indexPromise = fetch(INDEX_URL)
      .then(function (r) {
        if (!r.ok) throw new Error("Search index fetch failed: " + r.status);
        return r.json();
      })
      .then(function (data) {
        index = data;
        // Pre-normalize all text for faster search
        index.forEach(function (entry) {
          entry._ntitle = normalize(entry.title || "");
          entry._ndesc = normalize(entry.description || "");
          entry._nheadings = (entry.headings || []).map(normalize);
          entry._ncats = (entry.categories || []).map(normalize);
          entry._ntext = entry._ntitle + " " + entry._ndesc + " " + entry._nheadings.join(" ") + " " + entry._ncats.join(" ");
        });
        return index;
      })
      .catch(function (err) {
        console.warn("[SearchEngine] Failed to load index:", err);
        index = [];
        return index;
      });

    return indexPromise;
  }

  // ─── Scoring ───────────────────────────────────────────────────

  function scoreEntry(entry, tokens) {
    var score = 0;
    var text = entry._ntext;
    var title = entry._ntitle;
    var headings = entry._nheadings;

    for (var t = 0; t < tokens.length; t++) {
      var token = tokens[t];
      var inTitle = title.indexOf(token) !== -1;
      var inHeadings = headings.some(function (h) { return h.indexOf(token) !== -1; });
      var inAll = text.indexOf(token) !== -1;

      if (!inAll) {
        score = -1;
        break;
      }

      // Exact match on full title → highest score
      if (title === token) score += 100;
      // Title starts with token
      else if (title.indexOf(token) === 0) score += 60;
      // Token in title
      else if (inTitle) score += 40;
      // Token in headings
      else if (inHeadings) score += 20;
      // Token in description / categories
      else score += 10;
    }

    return score;
  }

  // ─── Public API ────────────────────────────────────────────────

  var SearchEngine = {
    /**
     * Search the index. Returns top results sorted by relevance.
     * @param {string} query - Raw user query
     * @param {number} maxResults - Max results to return (default 10)
     * @returns {Promise<Array<{path, title, snippet, score}>>}
     */
    search: function (query, maxResults) {
      maxResults = maxResults || 10;
      var q = normalize(query);
      if (!q || q.length < 1) return Promise.resolve([]);

      var tokens = q.split(/\s+/).filter(Boolean);

      return loadIndex().then(function (entries) {
        var scored = [];

        for (var i = 0; i < entries.length; i++) {
          var entry = entries[i];
          var score = scoreEntry(entry, tokens);
          if (score <= 0) continue;

          scored.push({
            path: entry.path,
            title: entry.title,
            snippet: buildSnippet(entry, tokens),
            score: score,
            category: entry.category || "",
          });
        }

        // Sort by score descending, then alphabetically
        scored.sort(function (a, b) {
          if (b.score !== a.score) return b.score - a.score;
          return a.path.localeCompare(b.path);
        });

        return scored.slice(0, maxResults);
      });
    },

    /**
     * Check if the index is loaded
     */
    isReady: function () {
      return index !== null;
    },

    /**
     * Preload the index (call on page init)
     */
    preload: function () {
      return loadIndex();
    },
  };

  // ─── Snippet Builder ───────────────────────────────────────────

  function buildSnippet(entry, tokens) {
    var desc = entry.description || "";
    if (!desc) return entry.title || "";

    var ndesc = normalize(desc);
    var snippet = desc;

    // Find the best matching window in the description
    for (var t = 0; t < tokens.length; t++) {
      var idx = ndesc.indexOf(tokens[t]);
      if (idx !== -1) {
        // Find approximate position in original text
        var start = Math.max(0, idx - 30);
        var end = Math.min(desc.length, start + 120);
        snippet = (start > 0 ? "…" : "") + desc.slice(start, end) + (end < desc.length ? "…" : "");
        break;
      }
    }

    return snippet;
  }

  // ─── Export ────────────────────────────────────────────────────

  global.SearchEngine = SearchEngine;
})(window);
