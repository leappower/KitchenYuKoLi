(function () {
  "use strict";

  var _spaRegs = {};
  function _spaOn(tgt, evt, fn, key) {
    if (_spaRegs[key]) _spaRegs[key].abort();
    var ac = new AbortController();
    _spaRegs[key] = ac;
    tgt.addEventListener(evt, fn, { signal: ac.signal });
  }

  var QR_IMAGE = "/assets/images/wechat-qr.webp";
  var TITLE = "微信扫码添加";
  var SUBTITLE = "添加企业微信，获取专属售后支持";

  var overlay = null;
  var scrollLocked = false;

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    document.documentElement.style.overflow = "hidden";
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    document.documentElement.style.overflow = "";
  }

  function getQRSize() {
    var vw = window.innerWidth;
    if (vw >= 1280) return "20rem";
    if (vw >= 1024) return "18rem";
    if (vw >= 768) return "16rem";
    return "14rem";
  }

  function getCardMaxWidth() {
    var vw = window.innerWidth;
    if (vw >= 1280) return "28rem";
    if (vw >= 1024) return "26rem";
    return "22rem";
  }

  function createModal() {
    overlay = document.createElement("div");
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", TITLE);
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);transition:opacity .2s ease;";

    var card = document.createElement("div");
    card.style.cssText =
      "max-width:24rem;width:100%;margin:1rem;background:#fff;border-radius:1rem;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);";
    card.className = "dark:bg-slate-900";

    var inner = document.createElement("div");
    inner.style.cssText = "position:relative;padding:2rem 1.5rem;text-align:center;";

    // Close button
    var closeBtn = document.createElement("button");
    closeBtn.setAttribute("aria-label", "关闭");
    closeBtn.style.cssText =
      "position:absolute;top:0.75rem;right:0.75rem;width:2rem;height:2rem;border-radius:50%;border:none;background:rgba(0,0,0,0.08);color:#64748b;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.25rem;line-height:1;transition:background .15s;";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("mouseenter", function () {
      closeBtn.style.background = "rgba(0,0,0,0.15)";
    });
    closeBtn.addEventListener("mouseleave", function () {
      closeBtn.style.background = "rgba(0,0,0,0.08)";
    });
    closeBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      closeModal();
    });
    inner.appendChild(closeBtn);

    // Title
    var title = document.createElement("h3");
    title.textContent = TITLE;
    title.style.cssText = "font-size:1.125rem;font-weight:700;margin-bottom:0.25rem;color:#0f172a;";
    title.className = "dark:text-white";
    inner.appendChild(title);

    // Subtitle
    var subtitle = document.createElement("p");
    subtitle.textContent = SUBTITLE;
    subtitle.style.cssText = "font-size:0.875rem;color:#64748b;margin-bottom:1.25rem;";
    inner.appendChild(subtitle);

    // QR image
    var img = document.createElement("img");
    img.src = QR_IMAGE;
    img.alt = TITLE;
    img.style.cssText =
      "width:" +
      getQRSize() +
      ";height:" +
      getQRSize() +
      ";object-fit:contain;border-radius:0.75rem;display:block;margin:0 auto;";
    inner.appendChild(img);

    card.appendChild(inner);
    overlay.appendChild(card);

    // Click backdrop to close
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
  }

  function openModal() {
    if (!overlay) createModal();
    lockScroll();
    overlay.style.display = "flex";
  }

  function closeModal() {
    if (!overlay) return;
    unlockScroll();
    overlay.style.display = "none";
  }

  function onKeydown(e) {
    if (e.key === "Escape" && overlay && overlay.style.display !== "none") {
      closeModal();
    }
  }

  document.addEventListener("keydown", onKeydown);

  function bindClicks() {
    // Use rAF to ensure DOM is updated (contact-channels may have just rendered)
    requestAnimationFrame(function () {
      var els = document.querySelectorAll('[data-action="show-wechat-qr"]');
      els.forEach(function (el) {
        el.removeEventListener("click", handleClick);
        el.addEventListener("click", handleClick);
      });
    });
  }

  function handleClick(e) {
    e.preventDefault();
    e.stopPropagation();
    openModal();
  }

  bindClicks();
  _spaOn(document, "spa:load", bindClicks, "spa:load");
})();
