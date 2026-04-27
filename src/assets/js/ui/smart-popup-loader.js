/**
 * Smart Popup Component Loader
 * Dynamically loads the Smart Popup component template
 */

var SmartPopupComponent = {
  // Configuration
  config: {
    templatePath: "/assets/templates/smart-popup-component.html",
    containerId: "smart-popup-container",
    overlayId: "smart-popup-overlay",
  },

  // Load state
  state: {
    loaded: false,
    loading: false,
  },

  /**
   * Initialize and load the Smart Popup component
   * @returns {Promise<boolean>} - Returns true if loaded successfully
   */
  init: function () {
    // Check if already loaded or loading
    if (this.state.loaded) {
      return Promise.resolve(true);
    }

    if (this.state.loading) {
      return this.waitForLoad();
    }

    // Check if overlay already exists in DOM
    if (document.getElementById(this.config.overlayId)) {
      this.state.loaded = true;
      return Promise.resolve(true);
    }

    // Start loading
    this.state.loading = true;

    return this.loadTemplate()
      .then(function (success) {
        SmartPopupComponent.state.loaded = success;
        SmartPopupComponent.state.loading = false;

        if (success) {
          // Initialize smart popup if available
          if (window.smartPopup && typeof window.smartPopup.init === "function") {
            window.smartPopup.init();
          }
        } else {
          console.error("[SmartPopupComponent] Failed to load template");
        }

        return success;
      })
      .catch(function (error) {
        console.error("[SmartPopupComponent] Error loading template:", error);
        SmartPopupComponent.state.loading = false;
        return false;
      });
  },

  /**
   * Load the template from the specified path
   * @returns {Promise<boolean>}
   */
  loadTemplate: function () {
    var self = this;

    return new Promise(function (resolve, _reject) {
      fetch(self.config.templatePath)
        .then(function (response) {
          if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
          }
          return response.text();
        })
        .then(function (html) {
          // Insert the HTML into the page
          var container = self.getOrCreateContainer();
          container.innerHTML = html;

          // Execute any scripts in the template
          self.executeScripts(container);

          resolve(true);
        })
        .catch(function (error) {
          console.error("[SmartPopupComponent] Fetch error:", error);
          resolve(false);
        });
    });
  },

  /**
   * Get or create the container element
   * @returns {HTMLElement}
   */
  getOrCreateContainer: function () {
    var container = document.getElementById(this.config.containerId);

    if (!container) {
      container = document.createElement("div");
      container.id = this.config.containerId;
      // Insert at the end of body
      document.body.appendChild(container);
    }

    return container;
  },

  /**
   * Execute scripts within the loaded template
   * @param {HTMLElement} container
   */
  executeScripts: function (container) {
    var scripts = container.getElementsByTagName("script");

    for (var i = 0; i < scripts.length; i++) {
      var script = scripts[i];
      var newScript = document.createElement("script");

      // Copy attributes
      for (var j = 0; j < script.attributes.length; j++) {
        var attr = script.attributes[j];
        newScript.setAttribute(attr.name, attr.value);
      }

      // Copy content
      if (script.textContent) {
        newScript.textContent = script.textContent;
      }

      // Replace the old script with the new one to execute it
      script.parentNode.replaceChild(newScript, script);
    }
  },

  /**
   * Wait for the component to finish loading
   * @returns {Promise<boolean>}
   */
  waitForLoad: function () {
    var self = this;
    return new Promise(function (resolve) {
      var checkInterval = setInterval(function () {
        if (!self.state.loading) {
          clearInterval(checkInterval);
          resolve(self.state.loaded);
        }
      }, 100);

      // Timeout after 5 seconds
      setTimeout(function () {
        clearInterval(checkInterval);
        resolve(false);
      }, 5000);
    });
  },

  /**
   * Check if the component is loaded
   * @returns {boolean}
   */
  isLoaded: function () {
    return this.state.loaded || document.getElementById(this.config.overlayId) !== null;
  },

  /**
   * Show the popup (wrapper for smartPopup.showPopup)
   * @param {string} triggerReason
   * @param {object} options
   */
  show: function (triggerReason, options) {
    if (window.smartPopup && typeof window.smartPopup.showPopup === "function") {
      window.smartPopup.showPopup(triggerReason, options);
    } else if (window.showSmartPopupManual) {
      window.showSmartPopupManual();
    } else {
      console.error("[SmartPopupComponent] smartPopup is not available");
    }
  },

  /**
   * Close the popup (wrapper for smartPopup.closePopup)
   * @param {object} options
   */
  close: function (options) {
    if (window.smartPopup && typeof window.smartPopup.closePopup === "function") {
      window.smartPopup.closePopup(options);
    } else if (window.closeSmartPopup) {
      window.closeSmartPopup();
    }
  },
};

// Auto-initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    // Don't auto-initialize, let the page decide when to load
  });
}

// Export for use in other scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = SmartPopupComponent;
}
