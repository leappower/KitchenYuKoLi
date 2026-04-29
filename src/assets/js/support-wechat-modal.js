(function () {
  'use strict';

  var QR_IMAGE = '/assets/images/wechat-qr.png';
  var TITLE = '微信扫码添加';
  var SUBTITLE = '添加企业微信，获取专属售后支持';

  var overlay = null;
  var scrollLocked = false;

  function lockScroll() {
    if (scrollLocked) return;
    scrollLocked = true;
    var y = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = '-' + y + 'px';
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';
    document.body.dataset.scrollY = y;
  }

  function unlockScroll() {
    if (!scrollLocked) return;
    scrollLocked = false;
    var y = parseInt(document.body.dataset.scrollY || '0', 10);
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.overflow = '';
    window.scrollTo(0, y);
  }

  function createModal() {
    overlay = document.createElement('div');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', TITLE);
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0;transition:opacity .25s ease;';

    var card = document.createElement('div');
    card.style.cssText = 'max-width:24rem;width:100%;margin:1rem;background:#fff;border-radius:1rem;overflow:hidden;box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);transform:scale(0.9);transition:transform .25s ease;';
    card.className = 'dark:bg-slate-900';

    var inner = document.createElement('div');
    inner.style.cssText = 'position:relative;padding:1.5rem;text-align:center;';

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
    var img = document.createElement('img');
    img.src = QR_IMAGE;
    img.alt = TITLE;
    img.style.cssText = 'width:12rem;height:12rem;object-fit:contain;border-radius:0.75rem;display:block;margin:0 auto;';
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
      overlay.style.display = 'none';
      unlockScroll();
    }, 250);
  }

  function onKeydown(e) {
    if (e.key === 'Escape' && overlay && overlay.style.display !== 'none') {
      closeModal();
    }
  }

  document.addEventListener('keydown', onKeydown);

  // Attach click handlers
  document.querySelectorAll('[data-action="show-wechat-qr"]').forEach(function (el) {
    el.addEventListener('click', function (e) {
      e.preventDefault();
      openModal();
    });
  });
})();
