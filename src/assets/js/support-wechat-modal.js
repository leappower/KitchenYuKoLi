(function () {
  'use strict';
  console.log('[WeChatModal] script loaded');

  var QR_IMAGE = '/assets/images/wechat-qr.webp';
  var TITLE = '微信扫码添加';
  var SUBTITLE = '添加企业微信，获取专属售后支持';

  var overlay = null;
  var scrollLocked = false;
  var _savedScrollY = 0;

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    _savedScrollY = window.scrollY;
    // Use overflow:hidden on html + body to prevent scroll without layout shift
    var html = document.documentElement;
    html.style.overflow = 'hidden';
    html.style.height = '100%';
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100%';
    // Compensate for scrollbar disappearing
    var scrollbarWidth = window.innerWidth - html.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = scrollbarWidth + 'px';
      document.body.style.boxSizing = 'border-box';
    }
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    var html = document.documentElement;
    html.style.overflow = '';
    html.style.height = '';
    document.body.style.overflow = '';
    document.body.style.height = '';
    document.body.style.paddingRight = '';
    document.body.style.boxSizing = '';
    window.scrollTo(0, _savedScrollY);
  }

  // Responsive QR size: bigger on larger screens
    function getQRSize() {
      var vw = window.innerWidth;
      if (vw >= 1280) return '20rem';   // xl: 320px
      if (vw >= 1024) return '18rem';   // lg: 288px
      if (vw >= 768)  return '16rem';   // md: 256px
      return '14rem';                    // sm: 224px
    }

    function getCardMaxWidth() {
      var vw = window.innerWidth;
      if (vw >= 1280) return '28rem';   // xl
      if (vw >= 1024) return '26rem';   // lg
      return '22rem';                    // sm/md
    }

    function createModal() {
    overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', TITLE);
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease;';

    var card = document.createElement('div');
    card.style.cssText = 'max-width:' + getCardMaxWidth() + ';width:100%;margin:1rem;background:#fff;border-radius:1rem;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);transform:scale(0.9);transition:transform .25s ease;';
    card.className = 'dark:bg-slate-900';

    var inner = document.createElement('div');
    inner.style.cssText = 'position:relative;padding:2rem 1.5rem;text-align:center;';

    // Close button
    var closeBtn = document.createElement('button');
    closeBtn.setAttribute('aria-label', '关闭');
    closeBtn.style.cssText = 'position:absolute;top:0.75rem;right:0.75rem;width:2rem;height:2rem;border-radius:50%;border:none;background:rgba(0,0,0,0.08);color:#64748b;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1.25rem;line-height:1;transition:background .15s;';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('mouseenter', function () { closeBtn.style.background = 'rgba(0,0,0,0.15)'; });
    closeBtn.addEventListener('mouseleave', function () { closeBtn.style.background = 'rgba(0,0,0,0.08)'; });
    closeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      closeModal();
    });
    inner.appendChild(closeBtn);

    // Title
    var title = document.createElement('h3');
    title.textContent = TITLE;
    title.style.cssText = 'font-size:1.125rem;font-weight:700;margin-bottom:0.25rem;color:#0f172a;';
    title.className = 'dark:text-white';
    inner.appendChild(title);

    // Subtitle
    var subtitle = document.createElement('p');
    subtitle.textContent = SUBTITLE;
    subtitle.style.cssText = 'font-size:0.875rem;color:#64748b;margin-bottom:1.25rem;';
    inner.appendChild(subtitle);

    // QR image
    var qrSize = getQRSize();
    var img = document.createElement('img');
    img.src = QR_IMAGE;
    img.alt = TITLE;
    img.style.cssText = 'width:' + qrSize + ';height:' + qrSize + ';object-fit:contain;border-radius:0.75rem;display:block;margin:0 auto;';
    inner.appendChild(img);

    card.appendChild(inner);
    overlay.appendChild(card);

    // Click backdrop to close
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.body.appendChild(overlay);
  }

  function openModal() {
    if (!overlay) createModal();
    lockScroll();
    overlay.style.display = 'flex';
    // Force reflow then animate in
    void overlay.offsetHeight;
    overlay.style.opacity = '1';
    overlay.querySelector('div').style.transform = 'scale(1)';
  }

  function closeModal() {
    if (!overlay) return;
    overlay.style.opacity = '0';
    overlay.querySelector('div').style.transform = 'scale(0.9)';
    setTimeout(function () {
      // Restore scroll position BEFORE hiding overlay to avoid jump
      unlockScroll();
      overlay.style.display = 'none';
    }, 250);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') {
      closeModal();
    }
  }

  document.addEventListener('keydown', onKeydown);

  // Attach click handlers (supports SPA re-navigation)
  function bindClicks() {
    var els = document.querySelectorAll('[data-action="show-wechat-qr"]');
    console.log('[WeChatModal] bindClicks called, found', els.length, 'elements');
    els.forEach(function (el) {
      el.removeEventListener('click', handleClick);
      el.addEventListener('click', handleClick);
      console.log('[WeChatModal] bound click to', el.tagName, el.className.slice(0, 50));
    });
  }
  function handleClick(e) {
    console.log('[WeChatModal] handleClick fired, overlay exists:', !!overlay);
    e.preventDefault();
    e.stopPropagation();
    openModal();
  }
  function openModal() {
    console.log('[WeChatModal] openModal called');
    if (!overlay) createModal();
    console.log('[WeChatModal] overlay display:', overlay.style.display, 'opacity:', overlay.style.opacity);
    lockScroll();
    overlay.style.display = 'flex';
    void overlay.offsetHeight;
    overlay.style.opacity = '1';
    overlay.querySelector('div').style.transform = 'scale(1)';
    console.log('[WeChatModal] modal opened');
  }
  bindClicks();
  document.addEventListener('spa:load', bindClicks);
})();
