/**
 * Smoke tests for page-interactions.js (IIFE build)
 *
 * page-interactions.js is a DOM-interaction layer that depends on real browser
 * events and other global IIFE modules (contacts.js, smart-popup.js).
 * Full integration tests require a real browser environment.
 *
 * These smoke tests verify:
 *  1. The IIFE loads without throwing
 *  2. window.PageInteractions is exposed with an init() function
 *  3. init() can be called safely when DOM is minimal (no crash)
 */

beforeAll(() => {
  delete global.PageInteractions;

  // Provide stub globals that page-interactions.js depends on
  global.showSmartPopupManual = jest.fn();
  global.closeSmartPopup = jest.fn();
  global.submitContactForm = jest.fn();
  global.startWhatsApp = jest.fn();
  global.startEmail = jest.fn();
  global.showNotification = jest.fn();
  global.smartPopup = { init: jest.fn() };

  require('../../src/assets/js/page-interactions.js');
});

describe('PageInteractions (IIFE — window.PageInteractions)', () => {
  it('should expose window.PageInteractions with an init function', () => {
    expect(global.PageInteractions).toBeDefined();
    expect(typeof global.PageInteractions.init).toBe('function');
  });

  it('should run init() without throwing on an empty DOM', () => {
    document.body.innerHTML = '';
    expect(() => global.PageInteractions.init()).not.toThrow();
  });

  it('should bind quote buttons when present in DOM', () => {
    document.body.innerHTML = '<button>Get a Quote</button>';
    expect(() => global.PageInteractions.init()).not.toThrow();
    // Simulate click — should call showSmartPopupManual
    const btn = document.querySelector('button');
    btn.click();
    expect(global.showSmartPopupManual).toHaveBeenCalled();
  });

  it('should wire forms to submitContactForm on submit', () => {
    document.body.innerHTML = '<form><input name="name"/><button type="submit">Submit</button></form>';
    global.PageInteractions.init();
    const form = document.querySelector('form');
    const event = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(event);
    expect(global.submitContactForm).toHaveBeenCalled();
  });

  it('should bind smart-popup close button when present', () => {
    document.body.innerHTML = '<button id="smart-popup-close">&#x2715;</button>';
    global.PageInteractions.init();
    const closeBtn = document.getElementById('smart-popup-close');
    closeBtn.click();
    expect(global.closeSmartPopup).toHaveBeenCalled();
  });
});
